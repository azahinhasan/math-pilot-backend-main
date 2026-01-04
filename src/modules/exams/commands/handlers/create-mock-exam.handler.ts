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
export class CreateMockExamHandler
  implements ICommandHandler<CreateMockExamCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateMockExamCommand) {
    const { name, questionSetName, year, season, moduleId } = command.payload;

    // Hardcoded time limit as per requirements
    const timeLimit = 120;

    // Fetch source question sets to find questions and metadata
    const sourceQuestionSets = await this.prisma.questionSet.findMany({
      where: {
        name: questionSetName,
        year,
        season,
        moduleId,
        questionId: { not: null },
      },
      orderBy: { serialNo: 'asc' },
    });

    if (sourceQuestionSets.length === 0) {
      throw new BadRequestException(
        `No question sets found for Question Set: ${questionSetName}, Year: ${year}, Season: ${season}, Module: ${moduleId}`,
      );
    }

    // Extract Question IDs
    const questionIds = sourceQuestionSets.map((qs) => qs.questionId!);
    const uniqueQuestionIds = [...new Set(questionIds)];

    // Derive metadata from the first question set entry
    // (Assuming consistent metadata across the set as per requirements)
    const metadataSource = sourceQuestionSets[0];
    const markSchemeUrl = metadataSource.markSchemeUrl ?? undefined;

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
            name: name?.trim() ? name.trim() : 'Mock Exam - Mathematics',
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
        // Note: Using 'serialNo' to match the Prisma schema.
        await tx.questionSet.createMany({
          data: uniqueQuestionIds.map((questionId, idx) => ({
            examId: exam.id,
            questionId,
            serialNo: idx + 1,
            name: questionSetName,
            year,
            season,
            markSchemeUrl,
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
