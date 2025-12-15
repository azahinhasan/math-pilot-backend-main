import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Subject } from '@prisma/client';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  boardAgeLevelId: string;

  @IsEnum(Subject, {
    message: 'Subject must be one of: Mathematics',
  })
  @IsNotEmpty()
  subject: Subject;

  @IsString()
  @IsOptional()
  formulaBookUrl?: string;

  @IsString()
  @IsOptional()
  logoFileName?: string;
}
