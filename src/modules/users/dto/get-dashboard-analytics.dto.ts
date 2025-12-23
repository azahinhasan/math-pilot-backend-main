import { IsOptional, IsDateString } from 'class-validator';

export class GetDashboardAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

