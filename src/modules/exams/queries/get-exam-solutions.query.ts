/**
 * Query to retrieve all question solutions for a specific exam.
 */
export class GetExamSolutionsQuery {
  /**
   * @param examId The unique ID of the exam.
   */
  constructor(public readonly examId: string) {}
}

