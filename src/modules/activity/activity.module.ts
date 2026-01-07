import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActivityController } from './activity.controller';
import { GetUserRecentActivityHandler } from './queries/handlers/get-user-recent-activity.handler';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [ActivityController],
  providers: [
    GetUserRecentActivityHandler,
  ],
})
export class ActivityModule {}
