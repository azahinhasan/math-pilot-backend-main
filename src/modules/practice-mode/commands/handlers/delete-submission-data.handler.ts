import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteSubmissionDataCommand } from '../../commands/delete-submission-data.command';

@CommandHandler(DeleteSubmissionDataCommand)
export class DeleteSubmissionDataHandler implements ICommandHandler<DeleteSubmissionDataCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteSubmissionDataCommand) {
    const { submissionId, studentId } = command;

    // 1. Verify the submission exists and belongs to the student
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { studentId: true, type: true },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.studentId !== studentId) {
      throw new ForbiddenException(
        'You do not have permission to delete this submission',
      );
    }

    // 2. Delete all related submission data
    // Order matters due to foreign key constraints (child tables first)

    // Delete SubmittedMatchingPair (linked via SubmittedAnswer)
    await this.prisma.submittedMatchingPair.deleteMany({
      where: { submissionId },
    });

    // Delete SubmittedAnswer
    await this.prisma.submittedAnswer.deleteMany({
      where: { submissionId },
    });

    // Delete SubmittedDescriptive
    await this.prisma.submittedDescriptive.deleteMany({
      where: { submissionId },
    });

    // Delete SubmittedMcq
    await this.prisma.submittedMcq.deleteMany({
      where: { submissionId },
    });

    return {
      status: 'success',
      message: 'Submission data deleted successfully',
    };
  }
}
