import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { SubmissionType, DifficultyLevel } from '@prisma/client';

export class GetPerformanceAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SubmissionType)
  submissionType?: SubmissionType;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;
}
