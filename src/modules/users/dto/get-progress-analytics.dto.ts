import { IsOptional, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetProgressAnalyticsDto {
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
  includeMilestones?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeRecommendations?: boolean;
}

