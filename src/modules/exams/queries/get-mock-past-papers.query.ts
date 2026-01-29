import { IQuery } from '@nestjs/cqrs';

export class GetMockPastPapersQuery implements IQuery {
  constructor(
    public readonly clerkId: string,
    public readonly moduleId?: string,
    public readonly boardId?: string,
  ) {}
}
