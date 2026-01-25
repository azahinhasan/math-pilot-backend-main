import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActivityController } from './activity.controller';
import { GetUserRecentActivityHandler } from './queries/handlers/get-user-recent-activity.handler';
import { ClerkModule } from 'src/clerk/clerk.module';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule, ClerkModule],
  controllers: [ActivityController],
  providers: [GetUserRecentActivityHandler],
})
export class ActivityModule {}
