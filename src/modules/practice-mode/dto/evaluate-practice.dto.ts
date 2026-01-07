import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CanvasDataItem {
  @IsNumber()
  @IsNotEmpty()
  serialNumber: number;

  @IsString()
  @IsNotEmpty()
  canvasData: string;
}

export class EvaluatePracticeDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  chatHistory?: string;

  @IsString()
  @IsNotEmpty()
  currentStepCount: string;

  @IsString()
  @IsNotEmpty()
  canvasData: string;

  @IsString()
  @IsNotEmpty()
  timeSpent: string;
  
}
