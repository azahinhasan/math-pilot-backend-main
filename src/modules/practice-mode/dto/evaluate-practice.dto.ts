import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CanvasDataItem {
  @IsNumber()
  @IsNotEmpty()
  serial_no: number;

  @IsObject()
  @IsNotEmpty()
  canvas_json: object;
}

export class EvaluatePracticeDto {
  @IsString()
  @IsNotEmpty()
  question_id: string;

  @IsOptional()
  chat_history?: string;

  @IsString()
  @IsNotEmpty()
  current_step_count: string;

  @IsString()
  @IsNotEmpty()
  canvas_data: string;
}
