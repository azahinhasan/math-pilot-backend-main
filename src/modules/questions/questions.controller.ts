import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateQuestionCommand } from './commands/create-question.command';
import { CreateQuestionDto } from './dto/create-question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.commandBus.execute(new CreateQuestionCommand(dto));
  }
}


