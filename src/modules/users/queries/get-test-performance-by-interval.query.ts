import { TimeInterval } from '../dto/get-test-performance-by-interval.dto';
import { SubmissionType, Subject } from '@prisma/client';

export class GetTestPerformanceByIntervalQuery {
  constructor(
    public readonly studentId: string,
    public readonly interval: TimeInterval,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly submissionType?: SubmissionType,
    public readonly subject?: Subject,
  ) {}
}
