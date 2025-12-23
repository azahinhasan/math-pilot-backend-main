import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExamsController } from './exams.controller';
import { CreateExamHandler } from './commands/handlers/create-exam.handler';
import { CreateMockExamHandler } from './commands/handlers/create-mock-exam.handler';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ExamsController],
  providers: [CreateExamHandler,CreateMockExamHandler],
})
export class ExamsModule {}


