import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetQuestionsByTopicQuery } from './queries/get-questions-by-topic.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';

@Controller('questions')
@UseGuards(ClerkAuthGuard)
export class QuestionsController {
  constructor(
    private readonly queryBus: QueryBus,
  ) {}

  @Get('practice-mode/topic/:topicId')
  async getQuestionsByTopic(
    @Param('topicId') topicId: string,
    @Req() req,
  ) {
    const clerkId = req.user.sub;

    return this.queryBus.execute(
      new GetQuestionsByTopicQuery(topicId, clerkId),
    );
  }
}
