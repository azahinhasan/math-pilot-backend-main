export class GetQuestionsByTopicQuery {
  constructor(
    public readonly topicId: string,
    public readonly clerkId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {}
}
