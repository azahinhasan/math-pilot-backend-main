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
export class EvaluatePracticeHandler
  implements ICommandHandler<EvaluatePracticeCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: EvaluatePracticeCommand): Promise<any> {
    const { question_id, chat_history, current_step_count, files, clerkId } = command;

    // Fetch the question with its type and solution details

    const question = await this.prisma.question.findUnique({
      where: { id: question_id },
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
    formData.append('current_step_count', current_step_count);
    if (chat_history) {
      formData.append('chat_history', chat_history);
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
            questionId: question_id,
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
              questionId: question_id,
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

        // Store the submitted descriptive answer with AI evaluation results
        // Includes extracted text, canvas data, verdict, hint, and chat history

        await this.prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: aiResponse.extracted_text,
            isCorrect: isCorrect,
            hint: aiResponse.hint,
            chatHistory: aiResponse.chat_history,
            verdict: aiResponse.verdict,
            canvasJson: aiResponse.canvas_json,
          },
        });

        // Format the response to return to the client
        // Includes submission details, AI evaluation, and progress tracking

        const formattedResponse = {
          submission_id: submission.id,
          question_id: question_id,
          student_id: student.id,
          status: submission.status,
          evaluation: aiResponse.evaluation,
          extracted_text: aiResponse.extracted_text,
          hint: aiResponse.hint,
          verdict: aiResponse.verdict,
          is_correct: isCorrect,
          is_finished: isFinished,
          next_step_count: aiResponse.nextStepCount,
          images_processed: aiResponse.images_processed,
          total_images: aiResponse.total_images,
          chat_history: aiResponse.chat_history,
          began_at: submission.beganAt,
          ended_at: submission.endedAt,
          canvasJson: aiResponse.canvas_json,
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
