import { IsEnum, IsOptional } from 'class-validator';
import { BoardName, AgeLevelName } from '@prisma/client';

export class UpdateBoardAgeLevelDto {
  @IsEnum(BoardName, {
    message: 'Board name must be one of: AQA, Edexcel, Pearson_Edexcel, OCR',
  })
  @IsOptional()
  boardName?: BoardName;

  @IsEnum(AgeLevelName, {
    message: 'Age level name must be one of: A_Level, GCSE',
  })
  @IsOptional()
  ageLevelName?: AgeLevelName;
}
