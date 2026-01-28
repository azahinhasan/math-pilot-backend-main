import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubmitTestCommand } from '../submit-test.command';
import { ExamsService } from '../../exams.service';
import { StreakService } from '../../../../users/streak.service';
import { PrismaService } from '../../../../prisma/prisma.service';

@CommandHandler(SubmitTestCommand)
export class SubmitTestHandler implements ICommandHandler<SubmitTestCommand> {
  constructor(
    private readonly examsService: ExamsService,
    private readonly streakService: StreakService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: SubmitTestCommand) {
    const result = await this.examsService.submitTest(
      command.dto,
      command.clerkId,
      command.files,
    );

    // Get studentId from clerkId and increment streak after successful submission
    const auth = await this.prisma.auth.findUnique({
      where: { clerkId: command.clerkId },
      select: { student: { select: { id: true } } },
    });

    if (auth?.student) {
      await this.streakService.incrementStreak(auth.student.id);
    }

    return result;
  }
}
