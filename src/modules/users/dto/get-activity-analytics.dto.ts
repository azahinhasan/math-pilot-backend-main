import { IsOptional, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetActivityAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeAi?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeSchedule?: boolean;
}
