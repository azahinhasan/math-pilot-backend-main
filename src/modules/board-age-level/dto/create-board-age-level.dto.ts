import { IsEnum, IsNotEmpty } from 'class-validator';
import { BoardName, AgeLevelName } from '@prisma/client';

export class CreateBoardAgeLevelDto {
  @IsEnum(BoardName, {
    message: 'Board name must be one of: AQA, Edexcel, Pearson_Edexcel, OCR',
  })
  @IsNotEmpty()
  boardName: BoardName;

  @IsEnum(AgeLevelName, {
    message: 'Age level name must be one of: A_Level, GCSE',
  })
  @IsNotEmpty()
  ageLevelName: AgeLevelName;
}
