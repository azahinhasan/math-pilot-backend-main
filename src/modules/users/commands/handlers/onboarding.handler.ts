import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { OnboardingCommand } from '../onboarding.command';
import { HttpException, HttpStatus } from '@nestjs/common';

@CommandHandler(OnboardingCommand)
export class OnboardingHandler implements ICommandHandler<OnboardingCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: OnboardingCommand): Promise<any> {
    const { email, clerkId, roleId, fullName, boardAgeLevelId, country } =
      command.onboardingDto;

    try {
      // Check if user already exists
      const existingAuth = await this.prisma.auth.findFirst({
        where: {
          OR: [{ email }, { clerkId }],
        },
      });

      if (existingAuth) {
        throw new HttpException(
          'User already exists with this email or clerk ID',
          HttpStatus.CONFLICT,
        );
      }

      // Validate role
      const userRole = await this.prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!userRole) {
        throw new HttpException(
          'Invalid role specified',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate boardAgeLevelId if provided
      if (boardAgeLevelId) {
        const boardAgeLevel = await this.prisma.boardAgeLevel.findUnique({
          where: { id: boardAgeLevelId },
        });
        if (!boardAgeLevel) {
          throw new HttpException(
            'Invalid board age level specified',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Create auth record
      const auth = await this.prisma.auth.create({
        data: {
          email,
          clerkId,
          roleId,
        },
      });

      // Create role-specific record
      if (userRole.name.toLowerCase() === 'student') {
        await this.prisma.student.create({
          data: {
            fullName,
            authId: auth.id,
            boardAgeLevelId,
            country,
            currentStreak: 0,
            longestStreak: 0,
            totalXp: 0,
            lastActivity: new Date(),
          },
        });
      } else if (userRole.name.toLowerCase() === 'guardian') {
        await this.prisma.guardian.create({
          data: {
            fullName,
            authId: auth.id,
          },
        });
      } else {
        throw new HttpException(
          'Unsupported role type for onboarding',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        message: 'User onboarded successfully',
        authId: auth.id,
        role: userRole.name,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Prisma errors
      if (error.code === 'P2002') {
        throw new HttpException(
          'User with this email or clerk ID already exists',
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        'Failed to onboard user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
