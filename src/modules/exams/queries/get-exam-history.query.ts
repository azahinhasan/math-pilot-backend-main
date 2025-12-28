import { GetExamHistoryDto } from '../dto/get-exam-history.dto';

/**
 * Query used to fetch exam history for a specific student.
 * Encapsulates the student ID (resolved from auth) and the user-provided filter/pagination criteria.
 */
export class GetExamHistoryQuery {
  constructor(
    public readonly studentId: string,
    public readonly queryDto: GetExamHistoryDto,
  ) {}
}

