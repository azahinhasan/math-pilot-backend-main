export class GetDashboardAnalyticsQuery {
  constructor(
    public readonly studentId: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}

