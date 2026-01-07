export class GetTopicsByUserBoardQuery {
  constructor(
    public readonly clerkId: string,
    public readonly subject?: string,
    public readonly paperNumber?: number,
  ) {}
}
