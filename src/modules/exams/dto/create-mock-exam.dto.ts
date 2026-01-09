import { IsString } from 'class-validator';

export class CreateMockExamDto {
  @IsString()
  mockExamId: string;
}
