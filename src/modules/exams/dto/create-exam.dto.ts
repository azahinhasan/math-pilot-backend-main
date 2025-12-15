import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExamDifficulty, ExamType } from '@prisma/client';

function normalizeDifficulty(value: unknown): ExamDifficulty | unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();

  if (v === 'beginner') return ExamDifficulty.Beginner;
  if (v === 'intermediate') return ExamDifficulty.Intermediate;
  if (v === 'advanced') return ExamDifficulty.Advanced;

  return value;
}

function normalizeExamType(value: unknown): ExamType | unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();

  // Keep backwards-compat for old clients, but canonical enum is "Competitive"
  if (v === 'competitive' || v === 'competetive') return ExamType.Competitive;
  if (v === 'normal') return ExamType.Normal;
  if (v === 'mock') return ExamType.Mock;

  return value;
}

export class CreateExamTopicSelectionDto {
  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  subtopicIds: string[];
}

export class CreateExamDto {
  @Transform(({ value }) => normalizeExamType(value))
  @IsEnum(ExamType, {
    message: 'type must be one of: Competitive, Normal, Mock',
  })
  @IsOptional()
  type?: ExamType;

  @Transform(({ value }) => normalizeDifficulty(value))
  @IsEnum(ExamDifficulty, {
    message:
      'difficulty must be one of: Beginner, Intermediate, Advanced (case-insensitive accepted)',
  })
  @IsOptional()
  difficulty?: ExamDifficulty;

  @IsInt()
  @Min(1)
  timeLimit: number;

  @IsInt()
  @Min(1)
  questions: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateExamTopicSelectionDto)
  topics: CreateExamTopicSelectionDto[];

  @IsOptional()
  @IsString()
  name?: string;
}


