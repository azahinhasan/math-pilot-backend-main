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
import { GetSubjectProgressQuery } from './queries/get-subject-progress.query';
import { GetSubjectPerformanceQuery } from './queries/get-subject-performance.query';
import { UpdateUserConfigDto } from './dto/update-user-config.dto';
import { UpdateUserConfigCommand } from './commands/update-user-config.command';
import { Patch } from '@nestjs/common';

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

  /**
   * PATCH /users/config
   * Update user configurations and profile settings.
   */
  @Patch('config')
  @UseGuards(ClerkAuthGuard)
  async updateConfig(@Req() req, @Body() dto: UpdateUserConfigDto) {
    const clerkId = req.user.sub;
    return this.commandBus.execute(new UpdateUserConfigCommand(clerkId, dto));
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

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }

  /**
   * GET /users/:studentId/subject-progress
   * Get subject-wise progress (completion ratio from practice mode)
   * 
   * Query params:
   * - subject: Filter by specific subject (optional)
   * - startDate: Start date for filtering (optional)
   * - endDate: End date for filtering (optional)
   */
  @Get(':studentId/subject-progress')
  async getSubjectProgress(
    @Param('studentId') studentId: string,
    @Query('subject') subject?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      const result = await this.queryBus.execute(
        new GetSubjectProgressQuery(
          studentId,
          subject,
          parsedStartDate,
          parsedEndDate,
        ),
      );

      return {
        success: true,
        message: 'Subject progress retrieved successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch subject progress: ${error.message}`,
      );
    }
  }

  /**
   * GET /users/:studentId/subject-performance
   * Get subject-wise performance (marks ratio from test/exam mode)
   * 
   * Query params:
   * - subject: Filter by specific subject (optional)
   * - startDate: Start date for filtering (optional)
   * - endDate: End date for filtering (optional)
   */
  @Get(':studentId/subject-performance')
  async getSubjectPerformance(
    @Param('studentId') studentId: string,
    @Query('subject') subject?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      const result = await this.queryBus.execute(
        new GetSubjectPerformanceQuery(
          studentId,
          subject,
          parsedStartDate,
          parsedEndDate,
        ),
      );

      return {
        success: true,
        message: 'Subject performance retrieved successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch subject performance: ${error.message}`,
      );
    }
  }
}
