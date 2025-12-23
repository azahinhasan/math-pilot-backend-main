import { ICommand } from '@nestjs/cqrs';

export class TryAgainCommand implements ICommand {
  constructor(
    public readonly question_id: string,
    public readonly clerkId: string,
  ) {}
}
