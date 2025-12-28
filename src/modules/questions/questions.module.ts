import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuestionsController } from './questions.controller';
import { GetQuestionsByTopicHandler } from './queries/handlers/get-questions-by-topic.handler';
import { CreateQuestionHandler } from './commands/handlers/create-question.handler';
import { GetQuestionSolutionHandler } from './queries/handlers/get-question-solution.handler';

// List of all Command Handlers to be registered as providers
export const CommandHandlers = [CreateQuestionHandler];

// List of all Query Handlers to be registered as providers
export const QueryHandlers = [GetQuestionSolutionHandler];

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [QuestionsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class QuestionsModule {}
