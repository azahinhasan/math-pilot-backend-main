import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExamCommand } from '../create-exam.command';
import { ExamType, ReviewStatus } from '@prisma/client';

type TopicSubtopicPair = { topicId: string; subtopicId: string };

@Injectable()
@CommandHandler(CreateExamCommand)
export class CreateExamHandler implements ICommandHandler<CreateExamCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateExamCommand) {
    const { payload } = command;
    const { difficulty, timeLimit, questions, topics, name, type } = payload;

    const examType = type ?? ExamType.Competitive;
    if (examType === ExamType.Competitive && !difficulty) {
      throw new BadRequestException(
        'difficulty is required when type is Competitive.',
      );
    }

    const pairs: TopicSubtopicPair[] = topics.flatMap((t) =>
      t.subtopicIds.map((subtopicId) => ({ topicId: t.topicId, subtopicId })),
    );

    if (pairs.length === 0) {
      throw new BadRequestException(
        'At least one topic/subtopic selection is required.',
      );
    }

    const uniqueTopicIds = [...new Set(topics.map((t) => t.topicId))];
    const uniqueSubtopicIds = [...new Set(pairs.map((p) => p.subtopicId))];

    // Validate topics exist
    const existingTopics = await this.prisma.topic.findMany({
      where: { id: { in: uniqueTopicIds } },
      select: { id: true },
    });
    if (existingTopics.length !== uniqueTopicIds.length) {
      const found = new Set(existingTopics.map((t) => t.id));
      const missing = uniqueTopicIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Unknown topicId(s): ${missing.join(', ')}`,
      );
    }

    // Validate subtopics exist and belong to the provided topicId
    const existingSubtopics = await this.prisma.subtopic.findMany({
      where: { id: { in: uniqueSubtopicIds } },
      select: { id: true, topicId: true },
    });
    if (existingSubtopics.length !== uniqueSubtopicIds.length) {
      const found = new Set(existingSubtopics.map((s) => s.id));
      const missing = uniqueSubtopicIds.filter((id) => !found.has(id));
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

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + timeLimit * 60_000);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
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

        return exam;
      });

      return {
        message: 'Exam created successfully',
        data: result,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create exam: ${error.message}`,
      );
    }
  }
}


