import { Type, Transform, plainToInstance } from 'class-transformer';
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
  data:
    | MCQSubmissionDataDto
    | TrueFalseSubmissionDataDto
    | DescriptiveSubmissionDataDto;
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

  @Transform(({ value }) => {
    // If value is already an array, return it
    if (Array.isArray(value)) {
      return value;
    }
    // If value is a string (from form data), parse it
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          throw new Error('Parsed value is not an array');
        }
        // Transform plain objects to QuestionSubmissionDto instances
        return plainToInstance(QuestionSubmissionDto, parsed);
      } catch (error) {
        throw new Error('Invalid JSON format for submissions');
      }
    }
    // If value is neither array nor string, throw error
    throw new Error('Submissions must be an array or a JSON string');
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuestionSubmissionDto)
  submissions: QuestionSubmissionDto[];
}
