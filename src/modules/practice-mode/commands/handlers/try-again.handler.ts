import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/prisma/prisma.service';
import { TryAgainCommand } from '../try-again.command';
import { NotFoundException } from '@nestjs/common';

/**
 * Handler for the TryAgainCommand
 * Allows students to retry a practice question by voiding their previous submission
 * and all associated submitted answers (MCQs and Descriptives)
 */

@CommandHandler(TryAgainCommand)
export class TryAgainHandler implements ICommandHandler<TryAgainCommand> {
  constructor(private readonly prisma: PrismaService) {}

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
    });

    return {
      success: true,
      message: 'Status updated successfully. You can try again.',
    };
  }
}
