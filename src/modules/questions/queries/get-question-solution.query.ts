/**
 * Query to retrieve the solution for a specific question.
 * Part of the CQRS pattern to decouple request intent from processing.
 */
export class GetQuestionSolutionQuery {
  /**
   * @param questionId The unique ID of the question to find the solution for.
   */
  constructor(public readonly questionId: string) {}
}
