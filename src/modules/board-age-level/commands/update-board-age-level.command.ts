import { BoardName, AgeLevelName } from '@prisma/client';

export class UpdateBoardAgeLevelCommand {
  constructor(
    public readonly id: string,
    public readonly boardName?: BoardName,
    public readonly ageLevelName?: AgeLevelName,
  ) {}
}
