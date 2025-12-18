export class GetTopicsByModuleQuery {
  constructor(
    public readonly moduleId: string,
    public readonly clerkId: string,
    public readonly paperNumber?: number,
  ) {}
}
