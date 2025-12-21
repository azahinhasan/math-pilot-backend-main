import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  InternalServerErrorException,
  Delete,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetUsersQuery } from './queries/get-users.query';
import { GetUserQuery } from './queries/get-user.query';
import { RegisterUserCommand } from './commands/register-user.command';
import { ClerkAuthGuard } from '../../clerk-auth-guard';

import { DeleteUserCommand } from './commands/delete-user.command';

import { RegisterUserDto } from './dto/register-user.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { OnboardingCommand } from './commands/onboarding.command';
import { GetPerformanceAnalyticsDto } from './dto/get-performance-analytics.dto';
import { GetPerformanceAnalyticsQuery } from './queries/get-performance-analytics.query';

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getUsers() {
    return this.queryBus.execute(new GetUsersQuery());
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    const { email, name, role, password, additionalInfo } = registerUserDto;
    return this.commandBus.execute(
      new RegisterUserCommand(email, name, role, password, additionalInfo),
    );
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  // TODO: Restrict to admin or self. For dev, maybe open or just auth.
  // !WARN: This is unsafe for prod.
  async deleteUser(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }

  @Post('onboarding')
  async onboarding(@Body() onboardingDto: OnboardingDto) {
    return this.commandBus.execute(new OnboardingCommand(onboardingDto));
  }

  @Get('profile')
  @UseGuards(ClerkAuthGuard)
  async getUserProfile(@Req() req) {
    try {
      // req.user is populated by ClerkAuthGuard with the JWT claims
      const clerkId = req.user.sub;

      // Execute Query to fetch user profile details including student/guardian info
      const userProfile = await this.queryBus.execute(
        new GetUserQuery(clerkId),
      );

      return {
        message: 'User profile retrieved successfully',
        profile: userProfile,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch user profile: ${error.message}`,
      );
    }
  }

  @Get('performance/analytics')
  @UseGuards(ClerkAuthGuard)
  async getPerformanceAnalytics(
    @Req() req,
    @Query() filters: GetPerformanceAnalyticsDto,
  ) {
    try {
      const clerkId = req.user.sub;

      const auth = await this.queryBus.execute(new GetUserQuery(clerkId));

      if (!auth.student) {
        throw new HttpException(
          'User is not a student',
          HttpStatus.BAD_REQUEST,
        );
      }

      const studentId = auth.student.id;

      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

      const analytics = await this.queryBus.execute(
        new GetPerformanceAnalyticsQuery(
          studentId,
          startDate,
          endDate,
          filters.submissionType,
          filters.difficulty,
          filters.topicId,
          filters.moduleId,
        ),
      );

      return {
        message: 'Performance analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch performance analytics: ${error.message}`,
      );
    }
  }

  @Get('test-analytics/:studentId')
  async getStudentPerformanceAnalytics(
    @Param('studentId') studentId: string,
    @Query() filters: GetPerformanceAnalyticsDto,
  ) {
    try {
      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

      const analytics = await this.queryBus.execute(
        new GetPerformanceAnalyticsQuery(
          studentId,
          startDate,
          endDate,
          filters.submissionType,
          filters.difficulty,
          filters.topicId,
          filters.moduleId,
        ),
      );

      return {
        message: 'Performance analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch performance analytics: ${error.message}`,
      );
    }
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }
}
