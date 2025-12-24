import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTopicsByModuleQuery } from '../get-topics-by-module.query';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetTopicsByModuleQuery)
export class GetTopicsByModuleHandler implements IQueryHandler<GetTopicsByModuleQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTopicsByModuleQuery) {
    const { moduleId, clerkId, paperNumber, page, limit } = query;

    // Fetch authenticated user data with student and board information
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

    // Extract student's board age level ID from auth data
    const studentBoardAgeLevelId =
      authData?.student?.boardAgeLevelId ??
      authData?.student?.boardAgeLevel?.id;

    if (!studentBoardAgeLevelId) {
      throw new BadRequestException('No board found for student');
    }

    // Verify module exists and retrieve its board age level
    const module = await this.prisma.module.findUnique({
      where: {
        id: moduleId,
      },
      select: {
        boardAgeLevelId: true,
        voided: true,
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // Ensure module belongs to the student's board
    if (module.boardAgeLevelId !== studentBoardAgeLevelId) {
      throw new BadRequestException('Module does not belong to student board');
    }

    // Build query filter for topics (with optional paper number filter)
    const whereClause: any = {
      moduleId,
      voided: false,
    };

    if (paperNumber) {
      whereClause.paperNumber = paperNumber;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await this.prisma.topic.count({
      where: whereClause,
    });

    // Fetch topics with module details and practice questions
    const topics = await this.prisma.topic.findMany({
      where: whereClause,
      include: {
        module: {
          select: {
            name: true,
            subject: true,
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
      skip,
      take: limit,
    });

    const studentId = authData?.student?.id;

    // Calculate progress for each topic based on completed practice questions
    const topicsWithProgress = await Promise.all(
      topics.map(async (topic) => {
        const totalPracticeQuestions = topic.questions.length;

        let progress = 0;
        // Calculate progress only if student exists and has practice questions
        if (studentId && totalPracticeQuestions > 0) {
          const practiceQuestionIds = topic.questions.map((q) => q.id);

          // Find all completed submissions for this topic's practice questions
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

          // Calculate progress percentage based on completed vs total questions
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
      page,
      limit,
      totalCount,
      data: topicsWithProgress,
    };
  }
}
