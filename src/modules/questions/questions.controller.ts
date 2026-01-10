import {
  Controller, Get, Param,
  UseGuards,
  Req,
  Post,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CommandBus, QueryBus, } from '@nestjs/cqrs';
import { GetQuestionsByTopicQuery } from './queries/get-questions-by-topic.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuestionCommand } from './commands/create-question.command';
import { GetQuestionSolutionQuery } from './queries/get-question-solution.query';

@Controller('questions')
@UseGuards(ClerkAuthGuard)
export class QuestionsController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Get('practice-mode/topic/:topicId')
  async getQuestionsByTopic(
    @Param('topicId') topicId: string, 
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const clerkId = req.user.sub;

    return this.queryBus.execute(
      new GetQuestionsByTopicQuery(topicId, clerkId, page, limit),
    );
  }

  /**
   * Endpoint to create a new question.
   * @param dto Data transfer object for question creation.
   */
  @Post()
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.queryBus.execute(new CreateQuestionCommand(dto));
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



