import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';
import { GetUsersHandler } from './queries/handlers/get-users.handler';
import { GetUserHandler } from './queries/handlers/get-user.handler';
import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { DeleteUserHandler } from './commands/handlers/delete-user.handler';
import { OnboardingHandler } from './commands/handlers/onboarding.handler';
import { GetPerformanceAnalyticsHandler } from './queries/handlers/get-performance-analytics.handler';
import { GetTestPerformanceByIntervalHandler } from './queries/handlers/get-test-performance-by-interval.handler';
import { GetActivityAnalyticsHandler } from './queries/handlers/get-activity-analytics.handler';
import { GetProgressAnalyticsHandler } from './queries/handlers/get-progress-analytics.handler';
import { GetDashboardAnalyticsHandler } from './queries/handlers/get-dashboard-analytics.handler';
import { GetSubjectProgressHandler } from './queries/handlers/get-subject-progress.handler';
import { GetSubjectPerformanceHandler } from './queries/handlers/get-subject-performance.handler';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [UsersController],
  providers: [
    GetUsersHandler,
    GetUserHandler,
    RegisterUserHandler,
    DeleteUserHandler,
    OnboardingHandler,
    GetPerformanceAnalyticsHandler,
    GetTestPerformanceByIntervalHandler,
    GetActivityAnalyticsHandler,
    GetProgressAnalyticsHandler,
    GetDashboardAnalyticsHandler,
    GetSubjectProgressHandler,
    GetSubjectPerformanceHandler,
  ],
})
export class UsersModule {}
