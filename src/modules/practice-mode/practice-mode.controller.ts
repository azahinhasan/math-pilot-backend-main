import { Body, Controller, FileTypeValidator, Get, ParseFilePipe, Post, Param, UploadedFiles, UseInterceptors, UseGuards, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EvaluatePracticeDto } from './dto/evaluate-practice.dto';
import { TryAgainDto } from './dto/try-again.dto';
import { EvaluatePracticeCommand } from './commands/evaluate-practice.command';
import { TryAgainCommand } from './commands/try-again.command';
import { GetSubmissionsQuery } from './queries/get-submissions.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';

@Controller('practice')
@UseGuards(ClerkAuthGuard)
export class PracticeModeController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('evaluate')
  @UseInterceptors(FilesInterceptor('images'))
  async evaluatePractice(
    @Body() evaluatePracticeDto: EvaluatePracticeDto,
    @Req() req,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          // new FileTypeValidator({ fileType: /image\/(png|jpeg|jpg)/ }),
        ],
      }),
    ) images: Array<Express.Multer.File>,
  ) {
    const parsedCanvasData = JSON.parse(evaluatePracticeDto.canvasData);

    return this.commandBus.execute(
      new EvaluatePracticeCommand(
        evaluatePracticeDto.questionId,
        parsedCanvasData,
        images,
        evaluatePracticeDto.currentStepCount,
        req.user.sub,
        parseInt(evaluatePracticeDto.timeSpent),
        evaluatePracticeDto.chatHistory,
      ),
    );
  }

  @Get('submissions/:questionId')
  async getSubmissions(@Param('questionId') questionId: string, @Req() req) {
    return this.queryBus.execute(new GetSubmissionsQuery(questionId, req.user.sub));
  }

  @Post('try-again')
  async tryAgain(@Body() tryAgainDto: TryAgainDto, @Req() req) {
    return this.commandBus.execute(
      new TryAgainCommand(tryAgainDto.question_id, req.user.sub),
    );
  }
}
