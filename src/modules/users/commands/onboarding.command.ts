import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID } from 'class-validator';

export class OnboardingDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  clerkId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsUUID()
  @IsOptional()
  boardAgeLevelId?: string;

  @IsString()
  @IsOptional()
  country?: string;
}

export class OnboardingCommand {
  constructor(public readonly onboardingDto: OnboardingDto) {}
}
