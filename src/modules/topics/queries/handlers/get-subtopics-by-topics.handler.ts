import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubtopicsByTopicsQuery } from '../get-subtopics-by-topics.query';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetSubtopicsByTopicsQuery)
export class GetSubtopicsByTopicsHandler
  implements IQueryHandler<GetSubtopicsByTopicsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetSubtopicsByTopicsQuery) {
    const { topicIds, clerkId } = query;

    if (!topicIds || topicIds.length === 0) {
      throw new BadRequestException('At least one topic ID is required');
    }

    const authData = await this.prisma.auth.findUnique({
      where: {
        clerkId,
      },
      include: {
        student: {
          include: {
            boardAgeLevel: true,
          },
        },
      },
    });

    if (!authData?.student?.boardAgeLevel) {
      throw new BadRequestException('No board and age level found for student');
    }

    const topics = await this.prisma.topic.findMany({
      where: {
        id: {
          in: topicIds,
        },
        voided: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (topics.length === 0) {
      throw new BadRequestException('No valid topics found');
    }

    const subtopics = await this.prisma.subtopic.findMany({
      where: {
        topicId: {
          in: topicIds,
        },
        voided: false,
      },
      include: {
        topic: {
          select: {
            id: true,
            name: true,
            paperNumber: true,
            serialNumber: true,
            module: {
              select: {
                id: true,
                name: true,
                subject: true,
              },
            },
          },
        },
        questions: {
          where: {
            questionFor: 'Practice',
            voided: false,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        {
          topicId: 'asc',
        },
        {
          serialNumber: 'asc',
        },
      ],
    });

    const studentId = authData.student.id;

    const subtopicsWithProgress = await Promise.all(
      subtopics.map(async (subtopic) => {
        const totalPracticeQuestions = subtopic.questions.length;

        let progress = 0;
        if (studentId && totalPracticeQuestions > 0) {
          const practiceQuestionIds = subtopic.questions.map((q) => q.id);

          const completedSubmissions = await this.prisma.submission.findMany({
            where: {
              studentId,
              questionId: {
                in: practiceQuestionIds,
              },
              type: 'Practice',
              status: {
                in: ['Submitted', 'Graded'],
              },
              voided: false,
            },
            select: {
              questionId: true,
            },
            distinct: ['questionId'],
          });

          const completedQuestionsCount = completedSubmissions.length;
          progress = Math.round(
            (completedQuestionsCount / totalPracticeQuestions) * 100,
          );
        }

        const { questions, ...subtopicData } = subtopic;

        return {
          ...subtopicData,
          progress,
          totalPracticeQuestions,
        };
      }),
    );

    const groupedByTopic = subtopicsWithProgress.reduce((acc, subtopic) => {
      const topicId = subtopic.topic.id;
      if (!acc[topicId]) {
        acc[topicId] = {
          topicId: subtopic.topic.id,
          topicName: subtopic.topic.name,
          paperNumber: subtopic.topic.paperNumber,
          serialNumber: subtopic.topic.serialNumber,
          module: subtopic.topic.module,
          subtopics: [],
        };
      }
      acc[topicId].subtopics.push({
        id: subtopic.id,
        name: subtopic.name,
        logoFileName: subtopic.logoFileName,
        serialNumber: subtopic.serialNumber,
        content: subtopic.content,
        progress: subtopic.progress,
        totalPracticeQuestions: subtopic.totalPracticeQuestions,
        createdAt: subtopic.createdAt,
        updatedAt: subtopic.updatedAt,
      });
      return acc;
    }, {});

    return {
      message: 'Subtopics retrieved successfully',
      totalTopics: topics.length,
      totalSubtopics: subtopicsWithProgress.length,
      data: Object.values(groupedByTopic),
    };
  }
}
