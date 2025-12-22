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
import { DifficultyLevel, ExamType } from '@prisma/client';

function normalizeDifficulty(value: unknown): DifficultyLevel | unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();

  // Accept common aliases/synonyms (case-insensitive)
  if (v === 'beginner') return DifficultyLevel.Easy;
  if (v === 'intermediate') return DifficultyLevel.Medium;
  if (v === 'advanced') return DifficultyLevel.Hard;

  if (v === 'easy') return DifficultyLevel.Easy;
  if (v === 'medium') return DifficultyLevel.Medium;
  if (v === 'hard') return DifficultyLevel.Hard;

  return value;
}

function normalizeExamType(value: unknown): ExamType | unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();

  if (v === 'competitive') return ExamType.Competitive;
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
  @IsEnum(DifficultyLevel, {
    message:
      'difficulty must be one of: Easy, Medium, Hard (aliases: Beginner/Intermediate/Advanced accepted)',
  })
  @IsOptional()
  difficulty?: DifficultyLevel;

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
