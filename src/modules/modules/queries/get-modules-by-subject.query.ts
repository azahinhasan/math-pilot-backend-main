import { Subject } from '@prisma/client';

export class GetModulesBySubjectQuery {
  constructor(public readonly subject: Subject) {}
}
