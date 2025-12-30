import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class DeleteFileDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}

export class DeleteMultipleFilesDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  keys: string[];
}

