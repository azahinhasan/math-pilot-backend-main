export class GetExamSubmissionsQuery {
  constructor(
    public readonly examId: string,
    public readonly studentId: string,
  ) {}
}
