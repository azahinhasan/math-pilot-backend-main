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
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
    if (
      !descriptiveSolution.descriptiveSolution &&
      !descriptiveSolution.descriptiveSolutionImage
    ) {
      throw new NotFoundException(
        'Correct answer for descriptive solution is not set.',
      );
    }

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

    const correctAnswer = descriptiveSolution.descriptiveSolution;
    const descriptiveSolutionImage =
      descriptiveSolution.descriptiveSolutionImage;

    if (!correctAnswer && !descriptiveSolutionImage) {
      throw new NotFoundException(
        'Correct answer for descriptive solution is not set.',
      );
    }

    // Prepare form data for AI evaluation API
    // Includes question text, correct answer, step count, chat history, and images
    const formData = new FormData();

    formData.append('user_id', student.authId);
    formData.append('question_id', question.id);
    formData.append('question_text', question.questionText);

    // Append question_image_base64 if imageFileName is present
    if (question.imageFileName) {
      const awsAccessKeyId =
        this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const awsSecretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );
      const awsRegion = this.configService.get<string>('AWS_REGION');
      const awsS3Bucket = this.configService.get<string>('AWS_S3_BUCKET');

      if (
        !awsAccessKeyId ||
        !awsSecretAccessKey ||
        !awsRegion ||
        !awsS3Bucket
      ) {
        throw new InternalServerErrorException(
          'AWS S3 configuration is missing.',
        );
      }

      const s3Client = new S3Client({
        region: awsRegion,
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      });

      try {
        const command = new GetObjectCommand({
          Bucket: awsS3Bucket,
          Key: question.imageFileName,
        });

        const response = await s3Client.send(command);
        const stream = response.Body as Readable;

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        const imageBuffer = Buffer.concat(chunks);

        formData.append('question_image', imageBuffer, question.imageFileName);
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to fetch question image from S3: ${error.message}`,
        );
      }
    }

    // Append correct_answer (text) if present
    if (correctAnswer) {
      formData.append('solution_text', correctAnswer.toString());
    }

    // Append correct_answer_image (image from S3) if present
    if (descriptiveSolutionImage) {
      const awsAccessKeyId =
        this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const awsSecretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );
      const awsRegion = this.configService.get<string>('AWS_REGION');
      const awsS3Bucket = this.configService.get<string>('AWS_S3_BUCKET');

      if (
        !awsAccessKeyId ||
        !awsSecretAccessKey ||
        !awsRegion ||
        !awsS3Bucket
      ) {
        throw new InternalServerErrorException(
          'AWS S3 configuration is missing.',
        );
      }

      const s3Client = new S3Client({
        region: awsRegion,
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      });

      const command = new GetObjectCommand({
        Bucket: awsS3Bucket,
        Key: descriptiveSolutionImage,
      });

      const response = await s3Client.send(command);
      const stream = response.Body as Readable;

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const imageBuffer = Buffer.concat(chunks);

      // Append image as separate field
      formData.append('solution_image', imageBuffer, descriptiveSolutionImage);
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

      if (response.status === 200 && response.data.generic) {
        const aiResponse = response.data.generic;
        // Determine correctness and completion status from AI response
        const isCorrect = aiResponse.verdict == 'correct';

        // Execute all database operations in a transaction
        const submission = await this.prisma.$transaction(async (tx) => {
          // Check if there's an existing InProgress submission for this question
          let submission = await tx.submission.findFirst({
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
            submission = await tx.submission.create({
              data: {
                studentId: student.id,
                questionId,
                type: 'Practice',
                topicId: question.topicId,
                status: isCorrect ? 'Graded' : 'InProgress',
                beganAt: new Date(),
                endedAt: isCorrect ? new Date() : null,
              },
            });
          } else {
            submission = await tx.submission.update({
              where: { id: submission.id },
              data: {
                status: isCorrect ? 'Graded' : 'InProgress',
                endedAt: new Date(),
              },
            });
          }

          // Delete the active canvas for this question if submission submitted
          await tx.activeCanvas.deleteMany({
            where: {
              questionId: questionId,
            },
          });

          // Store the submitted descriptive answer with AI evaluation results
          // Includes extracted text, canvas data, verdict, hint, and chat history
          await tx.submittedDescriptive.create({
            data: {
              submissionId: submission.id,
              solutionId: solutionBase.id,
              descriptiveSubmittedAnswer: aiResponse.extracted_text,
              isCorrect: isCorrect,
              hint: aiResponse.hint,
              verdict: aiResponse.verdict,
              canvasData: canvasData,
              evaluation: aiResponse.evaluation,
            },
          });

          // Update or create StudentTopicDetails for tracking student progress per topic
          // Check if this question was already attempted (has a submitted submission)
          const previousSubmission = await tx.submission.count({
            where: {
              studentId: student.id,
              questionId: questionId,
              type: 'Practice',
              voided: false,
            },
          });

          const existingTopicDetails = await tx.studentTopicDetails.findFirst({
            where: {
              studentId: student.id,
              topicId: question.topicId,
              type: 'Practice',
            },
          });

          // Get total practice questions for this topic
          const totalPracticeQuestions = await tx.question.count({
            where: {
              topicId: question.topicId,
              questionFor: 'Practice',
              voided: false,
            },
          });

          // Get all submissions for this topic to calculate stats
          const allTopicSubmissions = await tx.submission.findMany({
            where: {
              studentId: student.id,
              question: {
                topicId: question.topicId,
                questionFor: 'Practice',
              },
              type: 'Practice',
              voided: false,
            },
            include: {
              submittedDescriptives: true,
            },
          });

          // Count unique questions with correct answers (for topic completion status)
          const uniqueCorrectQuestions = new Set(
            allTopicSubmissions
              .filter(
                (sub) =>
                  sub.submittedDescriptives.some((desc) => desc.isCorrect) &&
                  sub.status === 'Graded',
              )
              .map((sub) => sub.questionId),
          );

          // Calculate Total Stats for Analytics
          const totalAttemptsCount = allTopicSubmissions.length;
          const totalCorrectCount = allTopicSubmissions.filter(
            (sub) => sub.status === 'Graded',
          ).length;

          const correctQuestionsCount = uniqueCorrectQuestions.size;

          // Determine status: Graded only if all practice questions are correct
          const topicStatus =
            correctQuestionsCount >= totalPracticeQuestions
              ? 'Graded'
              : 'InProgress';

          if (existingTopicDetails) {
            // Update existing record
            await tx.studentTopicDetails.update({
              where: { id: existingTopicDetails.id },
              data: {
                timeSpentInSeconds: { increment: timeSpent || 0 },
                lastAccessedAt: new Date(),
                status: topicStatus,
                questionsAttempted: totalAttemptsCount,
                questionsCorrect: totalCorrectCount,
              },
            });
          } else {
            // Create new record
            await tx.studentTopicDetails.create({
              data: {
                studentId: student.id,
                topicId: question.topicId,
                type: 'Practice',
                questionsAttempted: totalAttemptsCount,
                questionsCorrect: totalCorrectCount,
                timeSpentInSeconds: timeSpent || 0,
                lastAccessedAt: new Date(),
                status: topicStatus,
              },
            });
          }

          return submission;
        });

        // Format the response to return to the client
        // Includes submission details, AI evaluation, and progress tracking

        const formattedResponse = {
          submissionId: submission.id,
          questionId,
          studentId: student.id,
          status: submission.status,
          evaluation: aiResponse.evaluation,
          descriptiveSubmittedAnswer: aiResponse.extracted_text,
          hint: aiResponse.hint,
          verdict: aiResponse.verdict,
          isCorrect,
          beganAt: submission.beganAt,
          endedAt: submission.endedAt,
        };

        console.log('\n=== Formatted Response ===');
        console.log(JSON.stringify(formattedResponse, null, 2));

        return {
          success: true,
          message: 'AI evaluation successful',
          data: formattedResponse,
        };
      } else {
        throw new InternalServerErrorException('AI evaluation failed');
      }
      // Return failure response if AI evaluation was not successful
      // return { success: false, message: 'AI evaluation failed' };
    } catch (error) {
      // Log and throw error if API call fails
      console.log(error);
      throw new InternalServerErrorException(
        'Failed to call AI evaluation API.',
        error?.response?.statusText,
      );
    }
  }
}
