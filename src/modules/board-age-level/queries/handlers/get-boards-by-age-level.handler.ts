import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBoardsByAgeLevelQuery } from '../get-boards-by-age-level.query';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetBoardsByAgeLevelQuery)
export class GetBoardsByAgeLevelHandler
  implements IQueryHandler<GetBoardsByAgeLevelQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBoardsByAgeLevelQuery) {
    try {
      const { ageLevelName } = query;

      const boards = await this.prisma.boardAgeLevel.findMany({
        where: {
          ageLevelName,
          voided: false,
        },
        select: {
          id:true,
          boardName: true
        },
      });

      return {
        message: 'Boards retrieved successfully',
        ageLevelName,
        data: boards,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve boards for age level ${query.ageLevelName}: ${error.message}`);
    }
  }
}
