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
import { GetExamQuestionsHandler } from './queries/handlers/get-exam-questions.handler';
import { GetExamSolutionsHandler } from './queries/handlers/get-exam-solutions.handler';
import { GetExamSubmissionsHandler } from './queries/handlers/get-exam-submissions.handler';
import { GetMockPastPapersHandler } from './queries/handlers/get-mock-past-papers.handler';
import { ClerkModule } from 'src/clerk/clerk.module';
import { StreakService } from '../../users/streak.service';

// List of all Command Handlers to be registered as providers
export const CommandHandlers = [
  CreateExamHandler,
  CreateMockExamHandler,
  SubmitTestHandler,
];

// List of all Query Handlers to be registered as providers
export const QueryHandlers = [
  GetExamQuestionsHandler,
  GetExamSolutionsHandler,
  GetExamSubmissionsHandler,
  GetExamHistoryHandler,
  GetMockPastPapersHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, HttpModule, ConfigModule, ClerkModule],
  controllers: [ExamsController],
  providers: [
    ExamsService,
    StreakService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class ExamsModule {}
