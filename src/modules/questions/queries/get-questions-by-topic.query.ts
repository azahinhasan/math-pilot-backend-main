export class GetQuestionsByTopicQuery {
  constructor(
    public readonly topicId: string,
    public readonly clerkId: string,
  ) {}
}
