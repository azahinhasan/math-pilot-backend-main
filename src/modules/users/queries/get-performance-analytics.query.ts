import { SubmissionType, DifficultyLevel } from '@prisma/client';

export class GetPerformanceAnalyticsQuery {
  constructor(
    public readonly studentId: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly submissionType?: SubmissionType,
    public readonly difficulty?: DifficultyLevel,
    public readonly topicId?: string,
    public readonly moduleId?: string,
  ) {}
}
