import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Post,
  Body,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetQuestionsByTopicQuery } from './queries/get-questions-by-topic.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuestionCommand } from './commands/create-question.command';

@Controller('questions')
@UseGuards(ClerkAuthGuard)
export class QuestionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('practice-mode/topic/:topicId')
  async getQuestionsByTopic(@Param('topicId') topicId: string, @Req() req) {
    const clerkId = req.user.sub;

    return this.queryBus.execute(
      new GetQuestionsByTopicQuery(topicId, clerkId),
    );
  }

  @Post()
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.queryBus.execute(new CreateQuestionCommand(dto));
  }
}
