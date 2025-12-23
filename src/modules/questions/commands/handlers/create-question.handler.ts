import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuestionCommand } from '../create-question.command';
import {
  CreateQuestionDto,
  CreateSolutionOptionDto,
} from '../../dto/create-question.dto';

type QuestionTypeName = 'MCQ' | 'TrueFalse' | 'Descriptive';

@Injectable()
@CommandHandler(CreateQuestionCommand)
export class CreateQuestionHandler
  implements ICommandHandler<CreateQuestionCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateQuestionCommand) {
    const dto = command.payload;

    const questionType = await this.getQuestionTypeOrThrow(dto.questionTypeName);
    this.validateSolutionPayload(dto, questionType.name as QuestionTypeName);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const question = await tx.question.create({
          data: this.buildQuestionCreateData(dto, questionType.id),
        });

        const solutionBase = await tx.solutionBase.create({
          data: { questionId: question.id },
        });

        await this.createSolutionForQuestionType(tx, dto, questionType.name as QuestionTypeName, solutionBase.id);

        return tx.question.findUnique({
          where: { id: question.id },
          include: {
            questionType: true,
            solutionBases: {
              include: {
                solutionMCQs: true,
                solutionDescriptives: true,
              },
            },
          },
        });
      });

      return {
        message: 'Question created successfully',
        data: created,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create question: ${error.message}`,
      );
    }
  }

  private async getQuestionTypeOrThrow(name: string): Promise<QuestionType> {
    const qt = await this.prisma.questionType.findUnique({ where: { name } });
    if (!qt) {
      throw new BadRequestException(
        `Unknown question type '${name}'. Seed question_types first.`,
      );
    }
    return qt;
  }

  private validateSolutionPayload(dto: CreateQuestionDto, typeName: QuestionTypeName) {
    if (typeName === 'Descriptive') {
      if (!dto.descriptive?.descriptiveSolution?.trim()) {
        throw new BadRequestException(
          `descriptive.descriptiveSolution is required for Descriptive questions.`,
        );
      }
      return;
    }

    if (typeName === 'MCQ') {
      const options = dto.mcq?.options ?? [];
      this.validateMcqOptions(options, { enforceTwoOptions: false });
      return;
    }

    // TrueFalse
    if (!dto.trueFalse?.correct) {
      throw new BadRequestException(
        `trueFalse.correct is required for TrueFalse questions (must be 'True' or 'False').`,
      );
    }
  }

  private validateMcqOptions(
    options: CreateSolutionOptionDto[],
    { enforceTwoOptions }: { enforceTwoOptions: boolean },
  ) {
    if (!Array.isArray(options) || options.length < 2) {
      throw new BadRequestException('MCQ requires at least 2 options.');
    }
    if (enforceTwoOptions && options.length !== 2) {
      throw new BadRequestException('True/False requires exactly 2 options.');
    }
    const trimmed = options.map((o) => (o.optionText ?? '').trim());
    if (trimmed.some((t) => !t)) {
      throw new BadRequestException('Each option must have optionText.');
    }
    const correctCount = options.filter((o) => o.isCorrect === true).length;
    if (correctCount < 1) {
      throw new BadRequestException('At least one option must be marked isCorrect=true.');
    }
  }

  private buildQuestionCreateData(
    dto: CreateQuestionDto,
    questionTypeId: string,
  ): Prisma.QuestionCreateInput {
    return {
      name: dto.name.trim(),
      questionText: dto.questionText.trim(),
      questionContentLink: dto.questionContentLink.trim(),
      contentBy: dto.contentBy,
      questionFor: dto.questionFor,
      totalMarks: dto.totalMarks,
      timeLimit: dto.timeLimit,
      hint: dto.hint.trim(),
      explanation: dto.explanation?.trim(),
      givenContext: dto.givenContext?.trim(),
      findObjective: dto.findObjective?.trim(),
      imageUrl: dto.imageUrl?.trim(),
      difficulty_level: dto.difficultyLevel,
      stepCount: dto.stepCount,
      serialNo: dto.serialNo,
      questionType: { connect: { id: questionTypeId } },
    };
  }

  private async createSolutionForQuestionType(
    tx: Prisma.TransactionClient,
    dto: CreateQuestionDto,
    typeName: QuestionTypeName,
    solutionBaseId: string,
  ) {
    if (typeName === 'Descriptive') {
      const markingStepsJson =
        dto.descriptive?.markingStepsJson === undefined
          ? undefined
          : (dto.descriptive.markingStepsJson as Prisma.InputJsonValue);
      await tx.solutionDescriptive.create({
        data: {
          solutionBaseId,
          descriptiveSolution: dto.descriptive!.descriptiveSolution.trim(),
          markingStepsJson,
          maxMarks: dto.descriptive!.maxMarks,
        },
      });
      return;
    }

    if (typeName === 'MCQ') {
      const options = dto.mcq!.options;
      await tx.solutionMcq.createMany({
        data: options.map((o) => ({
          solutionBaseId,
          optionText: o.optionText.trim(),
          isCorrect: o.isCorrect === true,
          mark: o.mark,
        })),
      });
      return;
    }

    // TrueFalse
    const correct = dto.trueFalse!.correct;
    const mark = dto.trueFalse!.mark;
    await tx.solutionMcq.createMany({
      data: [
        {
          solutionBaseId,
          optionText: 'True',
          isCorrect: correct === 'True',
          mark: correct === 'True' ? mark : undefined,
        },
        {
          solutionBaseId,
          optionText: 'False',
          isCorrect: correct === 'False',
          mark: correct === 'False' ? mark : undefined,
        },
      ],
    });
  }
}


