import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  ParseFilePipe,
  Post,
  Param,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
  InternalServerErrorException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EvaluatePracticeDto } from './dto/evaluate-practice.dto';
import { TryAgainDto } from './dto/try-again.dto';
import { EvaluatePracticeCommand } from './commands/evaluate-practice.command';
import { TryAgainCommand } from './commands/try-again.command';
import { GetSubmissionsQuery } from './queries/get-submissions.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';
import { GetModuleStatisticsQuery } from './queries/get-module-statistics.query';

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
    @UploadedFiles() images: Array<Express.Multer.File>,
  ) {
    if (!images || images.length === 0) {
      throw new Error('At least one image is required');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxFileSize = 20 * 1024 * 1024; // 20MB

    for (const image of images) {
      if (!allowedMimeTypes.includes(image.mimetype)) {
        throw new InternalServerErrorException(
          `Invalid file type: ${image.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`,
        );
      }

      if (image.size > maxFileSize) {
        throw new InternalServerErrorException(
          `File size exceeds limit. Maximum allowed: ${maxFileSize / (1024 * 1024)}MB`,
        );
      }

      if (!image.buffer || image.buffer.length === 0) {
        throw new InternalServerErrorException('Invalid file: empty buffer');
      }
    }

    return this.commandBus.execute(
      new EvaluatePracticeCommand(
        evaluatePracticeDto.questionId,
        evaluatePracticeDto.canvasData,
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
    return this.queryBus.execute(
      new GetSubmissionsQuery(questionId, req.user.sub),
    );
  }

  @Post('try-again')
  async tryAgain(@Body() tryAgainDto: TryAgainDto, @Req() req) {
    return this.commandBus.execute(
      new TryAgainCommand(tryAgainDto.questionId, req.user.sub),
    );
  }

  @Get('statistics/:moduleId')
  async getModuleStatistics(@Param('moduleId') moduleId: string, @Req() req) {
    const clerkId = req.user.sub;

    return this.queryBus.execute(
      new GetModuleStatisticsQuery(moduleId, clerkId),
    );
  }
}
