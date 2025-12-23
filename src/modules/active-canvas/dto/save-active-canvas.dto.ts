import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SaveActiveCanvasDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsOptional()
  hint?: string;

  @IsString()
  @IsNotEmpty()
  canvasJson: string;
}
