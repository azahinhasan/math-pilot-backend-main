import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from '../get-user.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { StreakService } from '../../../../users/streak.service';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly streakService: StreakService,
  ) {}

  async execute(query: GetUserQuery): Promise<any> {
    const { clerkId } = query;

    const auth = await this.prisma.auth.findFirst({
      where: { clerkId: clerkId },
      select: {
        id: true,
        email: true,
        username: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            country: true,
            boardAgeLevel: {
              select: {
                id: true,
                boardName: true,
                ageLevelName: true,
              },
            },
          },
        },
        guardian: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!auth) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Check and reset streak if last activity was more than 2 days ago
    if (auth.student) {
      await this.streakService.checkAndResetStreak(auth.student.id);
    }

    return auth;
  }
}
