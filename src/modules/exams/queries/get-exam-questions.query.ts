/**
 * Query to retrieve all questions for a specific exam (without solutions).
 */
export class GetExamQuestionsQuery {
  /**
   * @param examId The unique ID of the exam.
   */
  constructor(public readonly examId: string) {}
}
