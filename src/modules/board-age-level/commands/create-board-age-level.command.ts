import { BoardName, AgeLevelName } from '@prisma/client';

export class CreateBoardAgeLevelCommand {
  constructor(
    public readonly boardName: BoardName,
    public readonly ageLevelName: AgeLevelName,
  ) {}
}
