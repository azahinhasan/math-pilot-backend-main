import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported sorting options for exam history
 */
export enum ExamHistorySortBy {
  MARKS = 'marks',
  RECENT = 'recent',
}

/**
 * Data Transfer Object for retrieving student exam history.
 * Supports filtering by topic/subtopic names, custom sorting, and pagination.
 */
export class GetExamHistoryDto {
  /**
   * Filter the history entries by a specific topic name (partial, case-insensitive match)
   */
  @IsOptional()
  @IsString()
  topic?: string;

  /**
   * Filter the history entries by a specific subtopic name (partial, case-insensitive match)
   */
  @IsOptional()
  @IsString()
  subtopic?: string;

  /**
   * The field used to sort the results. Defaults to 'recent' (descending chronological order).
   */
  @IsOptional()
  @IsEnum(ExamHistorySortBy)
  sortBy?: ExamHistorySortBy = ExamHistorySortBy.RECENT;

  /**
   * Pagination: The page number to retrieve (starts at 1)
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  /**
   * Pagination: Maximum number of entries to return per page
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

