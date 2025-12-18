import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTopicsByModuleQuery } from '../get-topics-by-module.query';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetTopicsByModuleQuery)
export class GetTopicsByModuleHandler
  implements IQueryHandler<GetTopicsByModuleQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTopicsByModuleQuery) {
    const { moduleId, clerkId, paperNumber } = query;

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

    if (module.boardAgeLevelId !== studentBoardAgeLevelId) {
      throw new BadRequestException('Module does not belong to student board');
    }

    const whereClause: any = {
      moduleId,
      voided: false,
    };

    if (paperNumber) {
      whereClause.paperNumber = paperNumber;
    }

    const topics = await this.prisma.topic.findMany({
      where: whereClause,
      include: {
        module: {
          select: {
            name: true,
            subject: true,
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

    return {
      message: 'Topics retrieved successfully',
      moduleId,
      paperNumber: paperNumber ?? 'all',
      data: topics,
    };
  }
}
