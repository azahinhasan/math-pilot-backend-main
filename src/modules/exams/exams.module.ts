import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExamsController } from './exams.controller';
import { CreateExamHandler } from './commands/handlers/create-exam.handler';

export const CommandHandlers = [CreateExamHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ExamsController],
  providers: [...CommandHandlers],
})
export class ExamsModule {}


