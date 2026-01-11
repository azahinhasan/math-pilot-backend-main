import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum QuestionTypeEnum {
  MCQ = 'MCQ',
  TrueFalse = 'TrueFalse',
  Descriptive = 'Descriptive',
}

// Base submission data interface
export class MCQSubmissionDataDto {
  @IsString()
  @IsNotEmpty()
  submittedOption: string;
}

export class TrueFalseSubmissionDataDto {
  @IsString()
  @IsNotEmpty()
  submittedOption: string; // "True" or "False"
}

export class DescriptiveSubmissionDataDto {
  @IsString()
  @IsOptional()
  descriptiveSubmittedAnswer?: string;

  @IsString()
  @IsOptional()
  solutionImageFileName?: string;

  @IsObject()
  @IsOptional()
  canvasData?: any;

  // @IsString()
  // @IsOptional()
  // hint?: string;

  // @IsString()
  // @IsOptional()
  // chatHistory?: string;
}

export class QuestionSubmissionDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  // @IsEnum(QuestionTypeEnum)
  // @IsNotEmpty()
  // questionType: QuestionTypeEnum;

  @IsObject()
  @IsNotEmpty()
  data: MCQSubmissionDataDto | TrueFalseSubmissionDataDto | DescriptiveSubmissionDataDto;
}

export class SubmitTestDto {
  // @IsString()
  // @IsNotEmpty()
  // studentId: string;

  @IsString()
  @IsOptional()
  examId?: string;

  @IsDateString()
  @IsNotEmpty()
  beganAt: string;

  @IsDateString()
  @IsOptional()
  endedAt?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuestionSubmissionDto)
  submissions: QuestionSubmissionDto[];
}

