import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ExamType, Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMockExamCommand } from '../create-mock-exam.command';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
@CommandHandler(CreateMockExamCommand)
export class CreateMockExamHandler implements ICommandHandler<CreateMockExamCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateMockExamCommand) {
    const { name, questionSetName, year, season, moduleId, boardId } =
      command.payload;

    // 1. Find the Past Paper based on the provided details
    const pastPaper = await this.prisma.pastPaper.findFirst({
      where: {
        name: questionSetName,
        year,
        season,
        moduleId,
        boardId,
        voided: false,
      },
      include: {
        questionSets: {
          where: { questionId: { not: null }, voided: false },
          orderBy: { serialNo: 'asc' },
        },
      },
    });

    if (!pastPaper) {
      throw new BadRequestException(
        `No Past Paper found for Name: ${questionSetName}, Year: ${year}, Season: ${season}, Module: ${moduleId}, Board: ${boardId}`,
      );
    }

    if (pastPaper.questionSets.length === 0) {
      throw new BadRequestException(
        `Past Paper found but has no questions linked. ID: ${pastPaper.id}`,
      );
    }

    // Use time limit from Past Paper or default to 120 minutes
    const timeLimit = pastPaper.timeLimit || 120;

    // Extract Question IDs
    const questionIds = pastPaper.questionSets.map((qs) => qs.questionId!);
    const uniqueQuestionIds = [...new Set(questionIds)];

    const { startTime, endTime } = this.computeStartEndTimes(timeLimit);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Verify questions exist and are not voided
        await this.assertQuestionsExist(tx, uniqueQuestionIds);

        const totalMarks = await this.sumTotalMarksForQuestions(
          tx,
          uniqueQuestionIds,
        );

        const exam = await tx.exam.create({
          data: {
            name: name?.trim() ? name.trim() : `Mock Exam - ${questionSetName}`,
            startTime,
            endTime,
            type: ExamType.Mock,
            difficulty: null,
            timeLimit,
            maxNumberOfQuestions: uniqueQuestionIds.length,
            status: ReviewStatus.Scheduled,
            totalMarks,
          },
        });

        // Create QuestionSet entries for the mock exam.
        // Linking to the original PastPaper and Questions.
        await tx.questionSet.createMany({
          data: uniqueQuestionIds.map((questionId, idx) => ({
            examId: exam.id,
            questionId,
            serialNo: idx + 1,
            pastPaperId: pastPaper.id,
            moduleId,
          })),
          skipDuplicates: true,
        });

        return exam;
      });

      return { message: 'Mock exam created successfully', data: result };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Failed to create mock exam: ${error.message}`,
      );
    }
  }

  private computeStartEndTimes(timeLimitMinutes: number) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timeLimitMinutes * 60_000);
    return { startTime, endTime };
  }

  private async assertQuestionsExist(db: DbClient, questionIds: string[]) {
    const found = await db.question.findMany({
      where: { id: { in: questionIds }, voided: false },
      select: { id: true },
    });
    if (found.length !== questionIds.length) {
      const foundSet = new Set(found.map((q) => q.id));
      const missing = questionIds.filter((id) => !foundSet.has(id));
      throw new BadRequestException(
        `Unknown questionId(s): ${missing.join(', ')}`,
      );
    }
  }

  private async sumTotalMarksForQuestions(
    db: DbClient,
    questionIds: string[],
  ): Promise<number> {
    const agg = await db.question.aggregate({
      where: { id: { in: questionIds } },
      _sum: { totalMarks: true },
    });
    return agg._sum.totalMarks ?? 0;
  }
}
