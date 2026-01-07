import { IQuery } from '@nestjs/cqrs';

export class GetMockPastPapersQuery implements IQuery {
  constructor(
    public readonly moduleId?: string,
    public readonly boardId?: string,
  ) {}
}
