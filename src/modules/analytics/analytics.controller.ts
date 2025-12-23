import {
  Controller,
  Get,
  UseGuards,
  Req,
  InternalServerErrorException,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ClerkAuthGuard } from '../../clerk-auth-guard';
import { GetUserQuery } from '../users/queries/get-user.query';
import { GetPerformanceAnalyticsDto } from '../users/dto/get-performance-analytics.dto';
import { GetPerformanceAnalyticsQuery } from '../users/queries/get-performance-analytics.query';
import { GetTestPerformanceByIntervalDto } from '../users/dto/get-test-performance-by-interval.dto';
import { GetTestPerformanceByIntervalQuery } from '../users/queries/get-test-performance-by-interval.query';
import { GetActivityAnalyticsDto } from '../users/dto/get-activity-analytics.dto';
import { GetActivityAnalyticsQuery } from '../users/queries/get-activity-analytics.query';
import { GetProgressAnalyticsDto } from '../users/dto/get-progress-analytics.dto';
import { GetProgressAnalyticsQuery } from '../users/queries/get-progress-analytics.query';
import { GetDashboardAnalyticsDto } from '../users/dto/get-dashboard-analytics.dto';
import { GetDashboardAnalyticsQuery } from '../users/queries/get-dashboard-analytics.query';
import { GetSubjectProgressQuery } from '../users/queries/get-subject-progress.query';
import { GetSubjectPerformanceQuery } from '../users/queries/get-subject-performance.query';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('performance')
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

  @Get('performance/:studentId')
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

  @Get('activity')
  @UseGuards(ClerkAuthGuard)
  async getActivityAnalytics(
    @Req() req,
    @Query() filters: GetActivityAnalyticsDto,
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
        new GetActivityAnalyticsQuery(
          studentId,
          startDate,
          endDate,
          filters.topicId,
          filters.moduleId,
          filters.includeAi,
          filters.includeSchedule,
        ),
      );

      return {
        message: 'Activity analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch activity analytics: ${error.message}`,
      );
    }
  }

  @Get('activity/:studentId')
  async getStudentActivityAnalytics(
    @Param('studentId') studentId: string,
    @Query() filters: GetActivityAnalyticsDto,
  ) {
    try {
      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

      const analytics = await this.queryBus.execute(
        new GetActivityAnalyticsQuery(
          studentId,
          startDate,
          endDate,
          filters.topicId,
          filters.moduleId,
          filters.includeAi,
          filters.includeSchedule,
        ),
      );

      return {
        message: 'Activity analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch activity analytics: ${error.message}`,
      );
    }
  }

  @Get('progress')
  @UseGuards(ClerkAuthGuard)
  async getProgressAnalytics(
    @Req() req,
    @Query() filters: GetProgressAnalyticsDto,
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
        new GetProgressAnalyticsQuery(
          studentId,
          startDate,
          endDate,
          filters.topicId,
          filters.moduleId,
          filters.includeMilestones,
          filters.includeRecommendations,
        ),
      );

      return {
        message: 'Progress analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch progress analytics: ${error.message}`,
      );
    }
  }

  @Get('progress/:studentId')
  async getStudentProgressAnalytics(
    @Param('studentId') studentId: string,
    @Query() filters: GetProgressAnalyticsDto,
  ) {
    try {
      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

      const analytics = await this.queryBus.execute(
        new GetProgressAnalyticsQuery(
          studentId,
          startDate,
          endDate,
          filters.topicId,
          filters.moduleId,
          filters.includeMilestones,
          filters.includeRecommendations,
        ),
      );

      return {
        message: 'Progress analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch progress analytics: ${error.message}`,
      );
    }
  }

  @Get('test-performance-by-interval')
  @UseGuards(ClerkAuthGuard)
  async getTestPerformanceByInterval(
    @Req() req,
    @Query() filters: GetTestPerformanceByIntervalDto,
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

      const performance = await this.queryBus.execute(
        new GetTestPerformanceByIntervalQuery(
          studentId,
          filters.interval,
          startDate,
          endDate,
          filters.submissionType,
          filters.subject,
        ),
      );

      return {
        message: 'Test performance by interval retrieved successfully',
        data: performance,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch test performance by interval: ${error.message}`,
      );
    }
  }

  @Get('test-performance-by-interval/:studentId')
  async getStudentTestPerformanceByInterval(
    @Param('studentId') studentId: string,
    @Query() filters: GetTestPerformanceByIntervalDto,
  ) {
    try {
      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

      const performance = await this.queryBus.execute(
        new GetTestPerformanceByIntervalQuery(
          studentId,
          filters.interval,
          startDate,
          endDate,
          filters.submissionType,
          filters.subject,
        ),
      );

      return {
        message: 'Test performance by interval retrieved successfully',
        data: performance,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch test performance by interval: ${error.message}`,
      );
    }
  }

  @Get('dashboard')
  @UseGuards(ClerkAuthGuard)
  async getDashboardAnalytics(
    @Req() req,
    @Query() filters: GetDashboardAnalyticsDto,
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
        new GetDashboardAnalyticsQuery(studentId, startDate, endDate),
      );

      return {
        message: 'Dashboard analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch dashboard analytics: ${error.message}`,
      );
    }
  }

  @Get('dashboard/:studentId')
  async getStudentDashboardAnalytics(
    @Param('studentId') studentId: string,
    @Query() filters: GetDashboardAnalyticsDto,
  ) {
    try {
      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : undefined;
      const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

      const analytics = await this.queryBus.execute(
        new GetDashboardAnalyticsQuery(studentId, startDate, endDate),
      );

      return {
        message: 'Dashboard analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch dashboard analytics: ${error.message}`,
      );
    }
  }

  /**
   * GET /api/v1/analytics/subject-progress/:studentId
   * Get subject-wise progress (completion ratio from practice mode)
   */
  @Get('subject-progress/:studentId')
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
   * GET /api/v1/analytics/subject-performance/:studentId
   * Get subject-wise performance (marks ratio from test/exam mode)
   */
  @Get('subject-performance/:studentId')
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

