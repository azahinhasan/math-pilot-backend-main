import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logoFileName?: string;

  @IsString()
  @IsNotEmpty()
  moduleId: string;

  @IsInt()
  @IsNotEmpty()
  serialNumber: number;

  @IsInt()
  @IsNotEmpty()
  paperNumber: number;
}
