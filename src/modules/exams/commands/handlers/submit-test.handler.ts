import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubmitTestCommand } from '../submit-test.command';
import { ExamsService } from '../../exams.service';

@CommandHandler(SubmitTestCommand)
export class SubmitTestHandler implements ICommandHandler<SubmitTestCommand> {
  constructor(private readonly examsService: ExamsService) {}

  async execute(command: SubmitTestCommand) {
    return this.examsService.submitTest(
      command.dto,
      command.clerkId,
      command.files,
    );
  }
}
