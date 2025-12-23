import { IsNotEmpty, IsString } from 'class-validator';

export class TryAgainDto {
  @IsNotEmpty()
  @IsString()
  question_id: string;
}
