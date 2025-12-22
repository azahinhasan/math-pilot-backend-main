import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExamCommand } from '../create-exam.command';
import { ExamType, Prisma, ReviewStatus } from '@prisma/client';

type TopicSubtopicPair = { topicId: string; subtopicId: string };
type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
@CommandHandler(CreateExamCommand)
export class CreateExamHandler implements ICommandHandler<CreateExamCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateExamCommand) {
    const { payload } = command;
    const { difficulty, timeLimit, questions, topics, name, type } = payload;

    const examType = this.getExamType(type);
    this.validateDifficulty(examType, difficulty);

    const pairs = this.flattenTopicSubtopicPairs(topics);
    this.ensurePairsNotEmpty(pairs);

    const uniqueTopicIds = this.unique(topics.map((t) => t.topicId));
    const uniqueSubtopicIds = this.unique(pairs.map((p) => p.subtopicId));

    await this.assertTopicsExist(this.prisma, uniqueTopicIds);
    await this.assertSubtopicsExistAndBelongToTopics(
      this.prisma,
      uniqueSubtopicIds,
      pairs,
    );

    const { startTime, endTime } = this.computeStartEndTimes(timeLimit);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const moduleId = await this.assertSingleModuleForTopics(tx, uniqueTopicIds);

        const exam = await tx.exam.create({
          data: {
            name: name?.trim() ? name.trim() : 'Competitive Test - Mathematics',
            startTime,
            endTime,
            type: examType,
            difficulty: examType === ExamType.Competitive ? difficulty : null,
            timeLimit,
            maxNumberOfQuestions: questions,
            status: ReviewStatus.Scheduled,
          },
        });

        await tx.examSubtopic.createMany({
          data: pairs.map((p) => ({
            examId: exam.id,
            topicId: p.topicId,
            subtopicId: p.subtopicId,
          })),
          skipDuplicates: true,
        });

        const selectedQuestionIds = await this.pickRandomQuestionIdsFromSubtopics(
          tx,
          uniqueSubtopicIds,
          questions,
        );

        await tx.questionSet.createMany({
          data: selectedQuestionIds.map((questionId, idx) => ({
            examId: exam.id,
            questionId,
            serialId: idx + 1,
            moduleId,
          })),
          skipDuplicates: true,
        });

        const totalMarks = await this.sumTotalMarksForQuestions(
          tx,
          selectedQuestionIds,
        );
        const updatedExam = await tx.exam.update({
          where: { id: exam.id },
          data: { totalMarks },
        });

        return updatedExam;
      });

      return {
        message: 'Exam created successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Failed to create exam: ${error.message}`,
      );
    }
  }

  private async assertSingleModuleForTopics(
    db: DbClient,
    topicIds: string[],
  ): Promise<string> {
    const topics = await db.topic.findMany({
      where: { id: { in: topicIds } },
      select: { moduleId: true },
    });
    const moduleIds = [...new Set(topics.map((t) => t.moduleId))];
    if (moduleIds.length !== 1) {
      throw new BadRequestException(
        'Selected topics must belong to the same module.',
      );
    }
    return moduleIds[0];
  }

  private getExamType(type?: ExamType): ExamType {
    return type ?? ExamType.Competitive;
  }

  private validateDifficulty(examType: ExamType, difficulty?: unknown) {
    if (
      (examType === ExamType.Competitive || examType === ExamType.Normal) &&
      !difficulty
    ) {
      throw new BadRequestException(
        'Difficulty is required when type is Competitive or Normal.',
      );
    }
  }

  private flattenTopicSubtopicPairs(
    topics: { topicId: string; subtopicIds: string[] }[],
  ): TopicSubtopicPair[] {
    return topics.flatMap((t) =>
      t.subtopicIds.map((subtopicId) => ({ topicId: t.topicId, subtopicId })),
    );
  }

  private ensurePairsNotEmpty(pairs: TopicSubtopicPair[]) {
    if (pairs.length === 0) {
      throw new BadRequestException(
        'At least one topic/subtopic selection is required.',
      );
    }
  }

  private unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  private async assertTopicsExist(db: DbClient, topicIds: string[]) {
    const existingTopics = await db.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true },
    });
    if (existingTopics.length !== topicIds.length) {
      const found = new Set(existingTopics.map((t) => t.id));
      const missing = topicIds.filter((id) => !found.has(id));
      throw new BadRequestException(`Unknown topicId(s): ${missing.join(', ')}`);
    }
  }

  private async assertSubtopicsExistAndBelongToTopics(
    db: DbClient,
    subtopicIds: string[],
    pairs: TopicSubtopicPair[],
  ) {
    const existingSubtopics = await db.subtopic.findMany({
      where: { id: { in: subtopicIds } },
      select: { id: true, topicId: true },
    });
    if (existingSubtopics.length !== subtopicIds.length) {
      const found = new Set(existingSubtopics.map((s) => s.id));
      const missing = subtopicIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Unknown subtopicId(s): ${missing.join(', ')}`,
      );
    }

    const subtopicTopicMap = new Map(
      existingSubtopics.map((s) => [s.id, s.topicId] as const),
    );
    const invalidPairs = pairs.filter(
      (p) => subtopicTopicMap.get(p.subtopicId) !== p.topicId,
    );
    if (invalidPairs.length > 0) {
      throw new BadRequestException(
        `Some subtopicIds do not belong to the provided topicId(s). Example: ${invalidPairs[0].topicId}/${invalidPairs[0].subtopicId}`,
      );
    }
  }

  private computeStartEndTimes(timeLimitMinutes: number) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timeLimitMinutes * 60_000);
    return { startTime, endTime };
  }

  private async pickRandomQuestionIdsFromSubtopics(
    db: DbClient,
    subtopicIds: string[],
    numberOfQuestions: number,
  ): Promise<string[]> {
    const available = await db.question.findMany({
      where: {
        voided: false,
        subtopicId: { in: subtopicIds },
      },
      select: { id: true },
    });

    if (numberOfQuestions > available.length) {
      throw new BadRequestException(
        `Requested ${numberOfQuestions} questions, but only ${available.length} question(s) are available in the selected subtopics.`,
      );
    }

    const ids = available.map((q) => q.id);
    this.shuffleInPlace(ids);
    return ids.slice(0, numberOfQuestions);
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

  // Fisher–Yates shuffle
  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
