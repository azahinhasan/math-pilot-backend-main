import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuestionsByTopicQuery } from '../get-questions-by-topic.query';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetQuestionsByTopicQuery)
export class GetQuestionsByTopicHandler
  implements IQueryHandler<GetQuestionsByTopicQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetQuestionsByTopicQuery) {
    const { topicId, clerkId } = query;

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

    const studentBoardAgeLevelId =
      authData?.student?.boardAgeLevelId ??
      authData?.student?.boardAgeLevel?.id;

    if (!studentBoardAgeLevelId) {
      throw new BadRequestException('No board found for student');
    }

    const topic = await this.prisma.topic.findUnique({
      where: {
        id: topicId,
      },
      include: {
        module: {
          select: {
            boardAgeLevelId: true,
            voided: true,
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

    const questions = await this.prisma.question.findMany({
      where: {
        topicId,
        voided: false,
      },
      include: {
        questionType: true,
        solutionBases: {
          include: {
            solutionMCQs: {
              where: {
                voided: false,
              },
            },
            solutionDescriptives: {
              where: {
                voided: false,
              },
            },
          },
        },
      },
      orderBy: {
        serialNo: 'asc',
      },
    });

    return {
      message: 'Questions retrieved successfully',
      topicId,
      data: questions,
    };
  }
}
