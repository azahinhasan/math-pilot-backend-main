import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { EvaluatePracticeCommand } from '../evaluate-practice.command';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

@CommandHandler(EvaluatePracticeCommand)
export class EvaluatePracticeHandler
  implements ICommandHandler<EvaluatePracticeCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: EvaluatePracticeCommand): Promise<any> {
    const { question_id, chat_history, current_step_count, files } = command;

    const question = await this.prisma.question.findUnique({
      where: { id: question_id },
      include: {
        questionType: true,
        solutionBases: {
          include: {
            solutionDescriptives: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found.');
    }

    if (question.questionType.name !== 'Descriptive') {
      throw new NotFoundException(
        'This question is not a descriptive question.',
      );
    }

    const solutionBase = question.solutionBases[0];
    if (
      !solutionBase ||
      !solutionBase.solutionDescriptives ||
      solutionBase.solutionDescriptives.length === 0
    ) {
      throw new NotFoundException('Solution for the question not found.');
    }

    const descriptiveSolution = solutionBase.solutionDescriptives[0];
    if (!descriptiveSolution.descriptiveSolution) {
      throw new NotFoundException(
        'Correct answer for descriptive solution is not set.',
      );
    }

    const correctAnswer = descriptiveSolution.descriptiveSolution;

    const formData = new FormData();
    formData.append('question', question.questionText);
    formData.append('correct_answer', correctAnswer.toString());
    formData.append('current_step_count', current_step_count);
    if (chat_history) {
      formData.append('chat_history', chat_history);
    }
    files.forEach((file) => {
      formData.append('images', file.buffer, file.originalname);
    });
    // formData.append('image', files[0].buffer, files[0].originalname);

    const apiUrl = this.configService.get<string>('EVALUATE_MATH_API_URL');
    if (!apiUrl) {
      throw new InternalServerErrorException(
        'Evaluation API URL is not configured.',
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(apiUrl, formData, {
          headers: { ...formData.getHeaders() },
          timeout: 240000, // 4 minutes timeout
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }),
      );

      console.log("AI Response: ",response);
      return true;
    } catch (error) {
      console.log(error)
      throw new InternalServerErrorException(
        'Failed to call evaluation API.',
        error.message,
      );
    }
  }
}
