import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { CreateExamHandler } from './commands/handlers/create-exam.handler';
import { CreateMockExamHandler } from './commands/handlers/create-mock-exam.handler';
import { SubmitTestHandler } from './commands/handlers/submit-test.handler';
import { GetExamHistoryHandler } from './queries/handlers/get-exam-history.handler';
import { GetExamSolutionsHandler } from './queries/handlers/get-exam-solutions.handler';

// List of all Command Handlers to be registered as providers
export const CommandHandlers = [
  CreateExamHandler,
  CreateMockExamHandler,
  SubmitTestHandler,
];

// List of all Query Handlers to be registered as providers
export const QueryHandlers = [GetExamSolutionsHandler, GetExamHistoryHandler];

@Module({
  imports: [CqrsModule, PrismaModule, HttpModule, ConfigModule],
  controllers: [ExamsController],
  providers: [
    ExamsService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class ExamsModule {}


