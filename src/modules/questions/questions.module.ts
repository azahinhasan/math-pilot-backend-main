import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuestionsController } from './questions.controller';
import { CreateQuestionHandler } from './commands/handlers/create-question.handler';

export const CommandHandlers = [CreateQuestionHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [QuestionsController],
  providers: [...CommandHandlers],
})
export class QuestionsModule {}


