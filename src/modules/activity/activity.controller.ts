import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUserRecentActivityQuery } from './queries/get-user-recent-activity.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';

@Controller('activity')
@UseGuards(ClerkAuthGuard)
export class ActivityController {
  constructor(
    private readonly queryBus: QueryBus,
  ) {}

  @Get('recent')
  async getUserRecentActivity(@Req() req) {
    const clerkId = req.user.sub;
    return this.queryBus.execute(new GetUserRecentActivityQuery(clerkId));
  }
}
