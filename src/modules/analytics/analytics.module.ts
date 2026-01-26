import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsController } from './analytics.controller';
import { UsersModule } from '../users/users.module';
import { ClerkModule } from 'src/clerk/clerk.module';

@Module({
  imports: [CqrsModule, UsersModule, ClerkModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
