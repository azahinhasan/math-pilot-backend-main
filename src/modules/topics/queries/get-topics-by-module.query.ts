export class GetTopicsByModuleQuery {
  constructor(
    public readonly moduleId: string,
    public readonly clerkId: string,
    public readonly paperNumber?: number,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}
