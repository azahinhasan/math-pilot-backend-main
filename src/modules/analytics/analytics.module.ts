import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsController } from './analytics.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CqrsModule, UsersModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}

