export class GetSubmissionsQuery {
  constructor(
    public readonly questionId: string,
    public readonly clerkId: string,
  ) {}
}
