export class GetSubtopicsByTopicsQuery {
  constructor(
    public readonly topicIds: string[],
    public readonly clerkId: string,
  ) {}
}
