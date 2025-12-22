import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/prisma/prisma.service';
import { TryAgainCommand } from '../try-again.command';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(TryAgainCommand)
export class TryAgainHandler implements ICommandHandler<TryAgainCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: TryAgainCommand): Promise<any> {
    const { question_id, clerkId } = command;

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

    await this.prisma.$transaction(async (tx) => {
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
