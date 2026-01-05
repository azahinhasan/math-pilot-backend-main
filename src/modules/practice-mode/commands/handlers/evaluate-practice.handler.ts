import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { EvaluatePracticeCommand } from '../evaluate-practice.command';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Handler for evaluating practice question submissions.
 * Sends student's handwritten solution images to AI evaluation API,
 * receives feedback, and stores the submission in the database.
 * Supports multiple attempts for the same question in practice mode.
 */

@CommandHandler(EvaluatePracticeCommand)
export class EvaluatePracticeHandler implements ICommandHandler<EvaluatePracticeCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: EvaluatePracticeCommand): Promise<any> {
    const {
      questionId,
      chatHistory,
      currentStepCount,
      timeSpent,
      files,
      clerkId,
      canvasData,
    } = command;

    // Fetch the question with its type and solution details

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        questionType: true,
        solutionBases: {
          include: {
            solutionDescriptives: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found.');
    }

    // Validate that this is a descriptive question type

    if (question.questionType.name !== 'Descriptive') {
      throw new NotFoundException(
        'This question is not a descriptive question.',
      );
    }

    // Extract the solution base and validate it exists

    const solutionBase = question.solutionBases[0];
    if (
      !solutionBase ||
      !solutionBase.solutionDescriptives ||
      solutionBase.solutionDescriptives.length === 0
    ) {
      throw new NotFoundException('Solution for the question not found.');
    }

    // Get the correct answer from the descriptive solution

    const descriptiveSolution = solutionBase.solutionDescriptives[0];
    if (!descriptiveSolution.descriptiveSolution) {
      throw new NotFoundException(
        'Correct answer for descriptive solution is not set.',
      );
    }

    const correctAnswer = descriptiveSolution.descriptiveSolution;

    // Prepare form data for AI evaluation API
    // Includes question text, correct answer, step count, chat history, and images

    const formData = new FormData();
    formData.append('question', question.questionText);
    formData.append('correct_answer', correctAnswer.toString());
    formData.append('current_step_count', currentStepCount);
    if (chatHistory) {
      formData.append('chat_history', chatHistory);
    }
    files.forEach((file) => {
      formData.append('images', file.buffer, file.originalname);
    });

    // Get the AI evaluation API URL from environment configuration

    const apiUrl = this.configService.get<string>('EVALUATE_MATH_API_URL');
    if (!apiUrl) {
      throw new InternalServerErrorException(
        'Evaluation API URL is not configured.',
      );
    }

    // Call the AI evaluation API and process the response

    try {
      // Send POST request to AI evaluation API with 4-minute timeout
      const response = await firstValueFrom(
        this.httpService.post<any>(apiUrl + '/practice_assessment', formData, {
          headers: { ...formData.getHeaders() },
          timeout: 240000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );

      if (response.data.success) {
        const aiResponse = response.data;

        // Find the student by clerkId for storing the submission
        const student = await this.prisma.student.findFirst({
          where: {
            auth: {
              clerkId: clerkId,
            },
          },
        });

        if (!student) {
          throw new NotFoundException('Student not found.');
        }

        // Determine correctness and completion status from AI response

        const isCorrect = aiResponse.verdict === 'correct';
        const isFinished = aiResponse.is_finished === true;

        // Check if there's an existing InProgress submission for this question
        let submission = await this.prisma.submission.findFirst({
          where: {
            studentId: student.id,
            questionId,
            type: 'Practice',
            status: 'InProgress',
            voided: false,
          },
          orderBy: {
            beganAt: 'desc',
          },
        });

        // If no InProgress submission exists, or if this submission is finished, create a new one
        if (!submission) {
          submission = await this.prisma.submission.create({
            data: {
              studentId: student.id,
              questionId,
              type: 'Practice',
              status: isFinished ? 'Submitted' : 'InProgress',
              beganAt: new Date(),
              endedAt: isFinished ? new Date() : null,
            },
          });
        } else {
          submission = await this.prisma.submission.update({
            where: { id: submission.id },
            data: {
              status: isFinished ? 'Submitted' : 'InProgress',
              endedAt: new Date(),
            },
          });
        }

        // Delete the active canvas for this question if submission submitted
        await this.prisma.activeCanvas.deleteMany({
          where: {
            questionId: questionId,
          },
        });

        // Store the submitted descriptive answer with AI evaluation results
        // Includes extracted text, canvas data, verdict, hint, and chat history

        await this.prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: aiResponse.extracted_text,
            isCorrect: isCorrect,
            hint: aiResponse.hint,
            chatHistory: aiResponse.chatHistory,
            verdict: aiResponse.verdict,
            canvasData: canvasData,
          },
        });

        // Update or create StudentTopicDetails for tracking student progress per topic
        // Check if this question was already attempted (has a submitted submission)
        const previousSubmission = await this.prisma.submission.count({
          where: {
            studentId: student.id,
            questionId: questionId,
            type: 'Practice',
            voided: false,
          },
        });

        const isFirstAttempt = previousSubmission === 0;

        const existingTopicDetails =
          await this.prisma.studentTopicDetails.findFirst({
            where: {
              studentId: student.id,
              topicId: question.topicId,
              type: 'Practice',
            },
          });

        // Get total practice questions for this topic
        const totalPracticeQuestions = await this.prisma.question.count({
          where: {
            topicId: question.topicId,
            questionFor: 'Practice',
            voided: false,
          },
        });

        // Get all correct submissions for this topic
        const correctSubmissions = await this.prisma.submission.findMany({
          where: {
            studentId: student.id,
            question: {
              topicId: question.topicId,
              questionFor: 'Practice',
            },
            type: 'Practice',
            status: 'Submitted',
            voided: false,
          },
          include: {
            submittedDescriptives: true,
          },
        });

        // Count unique questions with correct answers
        const uniqueCorrectQuestions = new Set(
          correctSubmissions
            .filter((sub) =>
              sub.submittedDescriptives.some((desc) => desc.isCorrect),
            )
            .map((sub) => sub.questionId),
        );

        // Add current question if it's correct and finished
        if (isCorrect && isFinished) {
          uniqueCorrectQuestions.add(questionId);
        }

        const correctQuestionsCount = uniqueCorrectQuestions.size;

        // Determine status: Submitted only if all practice questions are correct
        const topicStatus =
          correctQuestionsCount >= totalPracticeQuestions
            ? 'Submitted'
            : 'InProgress';

        if (existingTopicDetails) {
          // Update existing record
          const updateData: any = {
            timeSpentInSeconds: { increment: timeSpent || 0 },
            lastAccessedAt: new Date(),
            status: topicStatus,
          };

          // Only increment counts if this is the first attempt at this question
          if (isFirstAttempt) {
            updateData.questionsAttempted = { increment: 1 };
          }
          if (isCorrect) {
            updateData.questionsCorrect = { increment: 1 };
          }

          await this.prisma.studentTopicDetails.update({
            where: { id: existingTopicDetails.id },
            data: updateData,
          });
        } else {
          // Create new record
          await this.prisma.studentTopicDetails.create({
            data: {
              studentId: student.id,
              topicId: question.topicId,
              type: 'Practice',
              questionsAttempted: isFirstAttempt ? 1 : 0,
              questionsCorrect: isCorrect ? 1 : 0,
              timeSpentInSeconds: timeSpent || 0,
              lastAccessedAt: new Date(),
              status: topicStatus,
            },
          });
        }

        // Format the response to return to the client
        // Includes submission details, AI evaluation, and progress tracking

        const formattedResponse = {
          submissionId: submission.id,
          questionId,
          studentId: student.id,
          status: submission.status,
          evaluation: aiResponse.evaluation,
          extractedText: aiResponse.extracted_text,
          hint: aiResponse.hint,
          verdict: aiResponse.verdict,
          isCorrect,
          isFinished,
          nextStepCount: aiResponse.nextStepCount,
          imagesProcessed: aiResponse.images_processed,
          totalImages: aiResponse.total_images,
          chatHistory: aiResponse.chatHistory,
          beganAt: submission.beganAt,
          endedAt: submission.endedAt,
          canvasData: aiResponse.canvas_json,
        };

        console.log('\n=== Formatted Response ===');
        console.log(JSON.stringify(formattedResponse, null, 2));

        return {
          success: true,
          message: 'AI evaluation successful',
          data: formattedResponse,
        };
      }
      // Return failure response if AI evaluation was not successful
      return { success: false, message: 'AI evaluation failed' };
    } catch (error) {
      // Log and throw error if API call fails
      console.log(error);
      throw new InternalServerErrorException(
        'Failed to call evaluation API.',
        error.message,
      );
    }
  }
}
