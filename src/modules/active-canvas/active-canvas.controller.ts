import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';
import { SaveActiveCanvasDto } from './dto/save-active-canvas.dto';
import { SaveActiveCanvasCommand } from './commands/save-active-canvas.command';
import { GetActiveCanvasQuery } from './queries/get-active-canvas.query';

@Controller('active-canvas')
@UseGuards(ClerkAuthGuard)
export class ActiveCanvasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async saveActiveCanvas(
    @Body() saveActiveCanvasDto: SaveActiveCanvasDto,
    @Req() req,
  ) {
    return this.commandBus.execute(
      new SaveActiveCanvasCommand(
        saveActiveCanvasDto.questionId,
        req.user.sub,
        saveActiveCanvasDto.canvasData,
        saveActiveCanvasDto.hint,
      ),
    );
  }

  @Get(':questionId')
  async getActiveCanvas(@Param('questionId') questionId: string, @Req() req) {
    return this.queryBus.execute(
      new GetActiveCanvasQuery(questionId, req.user.sub),
    );
  }
}
