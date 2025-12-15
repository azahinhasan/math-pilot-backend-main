import { Subject } from '@prisma/client';

export class CreateModuleCommand {
  constructor(
    public readonly name: string,
    public readonly boardAgeLevelId: string,
    public readonly subject: Subject,
    public readonly description?: string,
    public readonly formulaBookUrl?: string,
    public readonly logoFileName?: string,
  ) {}
}
