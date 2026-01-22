export class DeleteSubmissionDataCommand {
  constructor(
    public readonly submissionId: string,
    public readonly studentId: string,
  ) {}
}
