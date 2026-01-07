import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMockExamDto {
  @IsOptional()
  @IsString()
  name?: string;

  // Mock-only metadata for the question set (per docs/db.dbml)
  @IsString()
  questionSetName: string;

  @Type(() => Number)
  @IsInt()
  year: number;

  @IsString()
  season: string;

  @IsString()
  moduleId: string;

  @IsString()
  boardId: string;
}
