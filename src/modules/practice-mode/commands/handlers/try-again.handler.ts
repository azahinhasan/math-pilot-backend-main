import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { TryAgainCommand } from '../try-again.command';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

/**
 * Handler for the TryAgainCommand
 * Allows students to retry a practice question by voiding their previous submission
 * and all associated submitted answers (MCQs and Descriptives)
 */

@CommandHandler(TryAgainCommand)
export class TryAgainHandler implements ICommandHandler<TryAgainCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: TryAgainCommand): Promise<any> {
    const { question_id, clerkId } = command;

    // Find the student by their Clerk authentication ID

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

    // Retrieve the most recent non-voided practice submission for this question

    const submission = await this.prisma.submission.findFirst({
      where: {
        studentId: student.id,
        questionId: question_id,
        type: 'Practice',
        voided: false,
      },
      orderBy: {
        beganAt: 'desc',
      },
      include: {
        submittedDescriptives: true,
        submittedMcqs: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(
        'No active submission found for this question.',
      );
    }

    // Void the submission and all associated answers in a transaction
    // This ensures data consistency - either all records are voided or none are

    await this.prisma.$transaction(async (tx) => {
      // Void all descriptive answers associated with this submission
      if (submission.submittedDescriptives.length > 0) {
        await tx.submittedDescriptive.updateMany({
          where: {
            submissionId: submission.id,
          },
          data: {
            voided: true,
          },
        });
      }

      // Void all MCQ answers associated with this submission
      if (submission.submittedMcqs.length > 0) {
        await tx.submittedMcq.updateMany({
          where: {
            submissionId: submission.id,
          },
          data: {
            voided: true,
          },
        });
      }

      // Void the submission itself
      await tx.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          voided: true,
        },
      });

      // Call external API to delete submission
      const apiUrl = this.configService.get<string>('EVALUATE_MATH_API_URL');
      if (!apiUrl) {
        throw new InternalServerErrorException(
          'Evaluation API URL is not configured.',
        );
      }

      try {
        const deleteResponse = await firstValueFrom(
          this.httpService.delete(
            `${apiUrl}/submissions/${student.authId}/${question_id}`,
            {
              timeout: 30000,
            },
          ),
        );

        // Check if the API call was successful
        if (deleteResponse.status !== 200) {
          throw new InternalServerErrorException(
            'Failed to delete submission from external service.',
          );
        }

        console.log('External API delete response:', deleteResponse.data);
      } catch (error) {
        console.error('Failed to delete submission from external API:', error);
        throw new InternalServerErrorException(
          'Failed to delete submission from external service(AI DB).',
        );
      }
    });

    return {
      success: true,
      message: 'Status updated successfully. You can try again.',
    };
  }
}
