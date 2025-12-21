import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTopicsByUserBoardQuery } from '../get-topics-by-user-board.query';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetTopicsByUserBoardQuery)
export class GetTopicsByUserBoardHandler
  implements IQueryHandler<GetTopicsByUserBoardQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTopicsByUserBoardQuery) {
    const { clerkId } = query;

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

    const { boardName, ageLevelName } = authData.student.boardAgeLevel;

    const topics = await this.prisma.topic.findMany({
      where: {
        voided: false,
        module: {
          boardAgeLevel: {
            boardName,
            ageLevelName,
          },
          voided: false,
        },
      },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            subject: true,
            boardAgeLevel: {
              select: {
                boardName: true,
                ageLevelName: true,
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
          paperNumber: 'asc',
        },
        {
          serialNumber: 'asc',
        },
      ],
    });

    const studentId = authData.student.id;

    const topicsWithProgress = await Promise.all(
      topics.map(async (topic) => {
        const totalPracticeQuestions = topic.questions.length;

        let progress = 0;
        if (studentId && totalPracticeQuestions > 0) {
          const practiceQuestionIds = topic.questions.map((q) => q.id);

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

        const { questions, ...topicData } = topic;

        return {
          ...topicData,
          progress,
        };
      }),
    );

    return {
      message: 'Topics retrieved successfully',
      boardName,
      ageLevelName,
      totalTopics: topicsWithProgress.length,
      data: topicsWithProgress,
    };
  }
}
