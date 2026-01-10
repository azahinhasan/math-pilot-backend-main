import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuestionsByTopicQuery } from '../get-questions-by-topic.query';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetQuestionsByTopicQuery)
export class GetQuestionsByTopicHandler implements IQueryHandler<GetQuestionsByTopicQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetQuestionsByTopicQuery) {
    const { topicId, clerkId, page, limit } = query;

    const authData = await this.prisma.auth.findUnique({
      where: {
        clerkId,
      },
      select: {
        id: true,
        clerkId: true,
        student: {
          select: {
            id: true,
            boardAgeLevelId: true,
            boardAgeLevel: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const studentBoardAgeLevelId =
      authData?.student?.boardAgeLevelId ??
      authData?.student?.boardAgeLevel?.id;

    if (!studentBoardAgeLevelId) {
      throw new BadRequestException('No board found for student');
    }

    if (!authData?.student?.id) {
      throw new BadRequestException('Student not found');
    }

    const studentId = authData.student.id;

    const topic = await this.prisma.topic.findUnique({
      where: {
        id: topicId,
      },
      select: {
        id: true,
        name: true,
        module: {
          select: {
            boardAgeLevelId: true,
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.module.boardAgeLevelId !== studentBoardAgeLevelId) {
      throw new BadRequestException('Topic does not belong to student board');
    }

    const skip = (page - 1) * limit;

    const [questions, totalCount] = await Promise.all([
      this.prisma.question.findMany({
        where: {
          topicId,
          voided: false,
        },
        select: {
          id: true,
          serialNo: true,
          questionText: true,
          questionContentLink: true,
          name:true,
          questionTypeId: true,
          questionFor: true,
          totalMarks: true,
          timeLimit: true,
          hint: true,
          explanation: true,
          givenContext: true,
          findObjective: true,
          imageFileName: true,
          difficultyLevel: true,
          stepCount: true,

          questionType: {
            select: {
              id: true,
              name: true,
              description: true
            },
          },
          solutionBases: {
            select: {
              id: true,
              questionId: true,
              solutionMCQs: {
                select: {
                  id: true,
                  optionText: true,
                  isCorrect: true,
                  voided: true,
                },
                where: {
                  voided: false,
                },
              },
              solutionDescriptives: {
                select: {
                  id: true,
                  markingStepsJson: true,
                  maxMarks: true,
                  isInputCanvases: true
                },
                where: {
                  voided: false,
                },
              },
            },
          },
          submissions: {
            select: {
              id: true,
            },
            where: {
              studentId: studentId,
              status: 'Graded',
            },
          },
        },
        orderBy: {
          serialNo: 'asc',
        },
        skip,
        take: limit,
      }),

      this.prisma.question.count({
        where: {
          topicId,
          voided: false,
        },
      }),
    ]);

    const questionsWithCompletionStatus = questions.map((question) => ({
      ...question,
      isCompleted: question.submissions.length > 0,
      submissions: undefined,
    }));

    return {
      message: 'Questions retrieved successfully',
      topicId,
      data: questionsWithCompletionStatus,
      pagination: {
        currentPage: page,
        totalCount,
        limit,
      },
    };
  }
}
