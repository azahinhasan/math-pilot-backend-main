import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetModuleStatisticsQuery } from '../get-module-statistics.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';

@QueryHandler(GetModuleStatisticsQuery)
export class GetModuleStatisticsHandler implements IQueryHandler<GetModuleStatisticsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetModuleStatisticsQuery) {
    const { moduleId, clerkId } = query;

    const auth = await this.prisma.auth.findUnique({
      where: { clerkId },
      include: { student: true },
    });

    if (!auth || !auth.student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const student = auth.student;

    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        topics: {
          where: { voided: false },
        },
      },
    });

    if (!module) {
      throw new HttpException('Module not found', HttpStatus.NOT_FOUND);
    }

    const topicIds = module.topics.map((topic) => topic.id);

    const studentTopicDetails = await this.prisma.studentTopicDetails.findMany({
      where: {
        studentId: student.id,
        topicId: { in: topicIds },
      },
      include: {
        topic: true,
      },
    });

    let completedTopics = 0;
    let inProgressTopics = 0;
    let totalTimeSpentInSeconds = 0;
    let totalQuestionsAttempted = 0;
    let totalQuestionsCorrect = 0;

    const topicStatusMap = new Map<string, SubmissionStatus | null>();

    studentTopicDetails.forEach((detail) => {
      totalTimeSpentInSeconds += detail.timeSpentInSeconds;

      if (detail.questionsAttempted) {
        totalQuestionsAttempted += detail.questionsAttempted;
      }

      if (detail.questionsCorrect) {
        totalQuestionsCorrect += detail.questionsCorrect;
      }

      topicStatusMap.set(detail.topicId, detail.status);

      if (detail.status === SubmissionStatus.Submitted) {
        completedTopics++;
      } else if (detail.status === SubmissionStatus.InProgress) {
        inProgressTopics++;
      }
    });

    const notStartedTopics =
      module.topics.length - completedTopics - inProgressTopics;

    return {
      message: 'Module statistics retrieved successfully',
      data: {
        completedTopics,
        inProgressTopics,
        notStartedTopics,
        totalTopics: module.topics.length,
        streak: student.currentStreak,
        totalTimeSpentInSeconds,
      },
    };
  }
}
