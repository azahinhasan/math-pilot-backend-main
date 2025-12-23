import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PracticeModeController } from './practice-mode.controller';
import { EvaluatePracticeHandler } from './commands/handlers/evaluate-practice.handler';
import { TryAgainHandler } from './commands/handlers/try-again.handler';
import { GetSubmissionsHandler } from './queries/handlers/get-submissions.handler';

@Module({
  imports: [CqrsModule, PrismaModule, HttpModule, ConfigModule],
  controllers: [PracticeModeController],
  providers: [EvaluatePracticeHandler, TryAgainHandler, GetSubmissionsHandler],
})
export class PracticeModeModule {}
