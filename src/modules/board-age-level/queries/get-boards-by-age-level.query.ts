import { AgeLevelName } from '@prisma/client';

export class GetBoardsByAgeLevelQuery {
  constructor(public readonly ageLevelName: AgeLevelName) {}
}
