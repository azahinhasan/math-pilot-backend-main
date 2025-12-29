import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating user configurations and profile settings.
 * Based on fields available in db.dbml and prisma schema.
 */
export class UpdateUserConfigDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  boardAgeLevelId?: string;

  // Institution specific fields from db.dbml
  @IsString()
  @IsOptional()
  institutionName?: string;

  @IsString()
  @IsOptional()
  institutionDescription?: string;
}

