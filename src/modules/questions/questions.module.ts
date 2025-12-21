import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuestionsController } from './questions.controller';
import { GetQuestionsByTopicHandler } from './queries/handlers/get-questions-by-topic.handler';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [QuestionsController],
  providers: [
    GetQuestionsByTopicHandler,
  ],
})
export class QuestionsModule {}
