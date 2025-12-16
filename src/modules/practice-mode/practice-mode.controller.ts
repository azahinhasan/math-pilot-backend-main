import { Body, Controller, FileTypeValidator, ParseFilePipe, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EvaluatePracticeDto } from './dto/evaluate-practice.dto';
import { EvaluatePracticeCommand } from './commands/evaluate-practice.command';

@Controller('practice')
export class PracticeModeController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('evaluate')
  @UseInterceptors(FilesInterceptor('images'))
  async evaluatePractice(
    @Body() evaluatePracticeDto: EvaluatePracticeDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
      }),
    ) images: Array<Express.Multer.File>,
  ) {
    const parsedCanvasData = JSON.parse(evaluatePracticeDto.canvas_data);

    return this.commandBus.execute(
      new EvaluatePracticeCommand(
        evaluatePracticeDto.question_id,
        parsedCanvasData,
        images,
        evaluatePracticeDto.current_step_count,
        evaluatePracticeDto.chat_history,
      ),
    );
  }
}
