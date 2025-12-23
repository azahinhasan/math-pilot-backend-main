import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMockExamDto {
  @IsOptional()
  @IsString()
  name?: string;

  // Mock-only metadata for the question set (per docs/db.dbml)
  @IsOptional()
  @IsString()
  questionSetName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  season?: string;

  @IsOptional()
  @IsString()
  markSchemeUrl?: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeLimit: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  questionIds: string[];
}


