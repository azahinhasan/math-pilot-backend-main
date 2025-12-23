/**
 * Query to get subject-wise performance (marks ratio from tests/exams)
 * Performance = How well student scored in tests
 */
export class GetSubjectPerformanceQuery {
  constructor(
    public readonly studentId: string,
    public readonly subject?: string, // Filter by specific subject (default: all subjects)
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}

