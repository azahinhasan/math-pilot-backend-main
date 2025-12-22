import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { SubmissionType } from '@prisma/client';

export enum TimeInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetTestPerformanceByIntervalDto {
  @IsEnum(TimeInterval)
  interval: TimeInterval;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SubmissionType)
  submissionType?: SubmissionType;
}
