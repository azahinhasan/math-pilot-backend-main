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

    // Fetch user authentication data along with student profile and board/age level information
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

    // Validate that the student has an assigned board and age level
    if (!authData?.student?.boardAgeLevel) {
      throw new BadRequestException('No board and age level found for student');
    }

    // Extract board and age level information for filtering topics
    const { boardName, ageLevelName } = authData.student.boardAgeLevel;

    // Retrieve all non-voided topics that match the student's board and age level
    // Also ensures the parent module is not voided
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
      // Include related module information with selected fields
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
      },
      // Sort topics first by paper number, then by serial number in ascending order
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
      boardName,
      ageLevelName,
      totalTopics: topics.length,
      data: topics,
    };
  }
}
