import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PracticeModeController } from './practice-mode.controller';
import { EvaluatePracticeHandler } from './commands/handlers/evaluate-practice.handler';

@Module({
  imports: [CqrsModule, PrismaModule, HttpModule, ConfigModule],
  controllers: [PracticeModeController],
  providers: [EvaluatePracticeHandler],
})
export class PracticeModeModule {}
