export class GetProgressAnalyticsQuery {
  constructor(
    public readonly studentId: string,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly topicId?: string,
    public readonly moduleId?: string,
    public readonly includeMilestones?: boolean,
    public readonly includeRecommendations?: boolean,
  ) {}
}

