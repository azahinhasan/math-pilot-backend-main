export class GetModuleStatisticsQuery {
  constructor(
    public readonly moduleId: string,
    public readonly clerkId: string,
  ) {}
}
