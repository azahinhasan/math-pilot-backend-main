import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateQuestionCommand } from './commands/create-question.command';
import { CreateQuestionDto } from './dto/create-question.dto';
import { GetQuestionSolutionQuery } from './queries/get-question-solution.query';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Endpoint to create a new question.
   * @param dto Data transfer object for question creation.
   */
  @Post()
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.commandBus.execute(new CreateQuestionCommand(dto));
  }

  /**
   * Endpoint to retrieve the solution for a specific question by ID.
   * @param questionId The unique identifier of the question.
   */
  @Get(':questionId/solution')
  async getQuestionSolution(@Param('questionId') questionId: string) {
    return this.queryBus.execute(new GetQuestionSolutionQuery(questionId));
  }
}


