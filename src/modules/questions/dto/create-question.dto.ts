import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentBy, DifficultyLevel, QuestionFor } from '@prisma/client';

export class CreateSolutionOptionDto {
  @IsString()
  @IsNotEmpty()
  optionText!: string;

  @IsOptional()
  @IsInt()
  mark?: number;

  // We validate "at least one correct option" in the handler (cross-field).
  @IsOptional()
  isCorrect?: boolean;
}

export class CreateMcqSolutionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSolutionOptionDto)
  options!: CreateSolutionOptionDto[];
}

export class CreateTrueFalseSolutionDto {
  @IsIn(['True', 'False'])
  correct!: 'True' | 'False';

  @IsOptional()
  @IsInt()
  mark?: number;
}

export class CreateDescriptiveSolutionDto {
  @IsString()
  @IsNotEmpty()
  descriptiveSolution!: string;

  // Stored as Prisma Json; we validate it loosely as "any".
  @IsOptional()
  markingStepsJson?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMarks?: number;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  questionContentLink!: string;

  @IsOptional()
  @IsIn([ContentBy.HUMAN, ContentBy.AI])
  contentBy?: ContentBy;

  @IsOptional()
  @IsIn([QuestionFor.Test, QuestionFor.Practice])
  questionFor?: QuestionFor;

  @IsOptional()
  @IsInt()
  difficulty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalMarks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeLimit?: number;

  @IsString()
  @IsNotEmpty()
  hint!: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  givenContext?: string;

  @IsOptional()
  @IsString()
  findObjective?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsIn([
    DifficultyLevel.Easy,
    DifficultyLevel.Medium,
    DifficultyLevel.Hard,
  ])
  difficultyLevel?: DifficultyLevel;

  @IsInt()
  @Min(1)
  stepCount!: number;

  @IsInt()
  @Min(1)
  serialNo!: number;

  // We store questionTypeId on Question, but accept name in the API.
  @IsIn(['MCQ', 'TrueFalse', 'Descriptive'])
  questionTypeName!: 'MCQ' | 'TrueFalse' | 'Descriptive';

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMcqSolutionDto)
  mcq?: CreateMcqSolutionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTrueFalseSolutionDto)
  trueFalse?: CreateTrueFalseSolutionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDescriptiveSolutionDto)
  descriptive?: CreateDescriptiveSolutionDto;
}


