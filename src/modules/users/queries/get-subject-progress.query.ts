/**
 * Query to get subject-wise progress (completion ratio from practice)
 * Progress = How much practice has been completed
 */
export class GetSubjectProgressQuery {
  constructor(
    public readonly studentId: string,
    public readonly subject?: string, // Filter by specific subject (default: all subjects)
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}

