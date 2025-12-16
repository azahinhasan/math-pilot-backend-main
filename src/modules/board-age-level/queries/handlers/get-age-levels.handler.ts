import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAgeLevelsQuery } from '../get-age-levels.query';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetAgeLevelsQuery)
export class GetAgeLevelsHandler implements IQueryHandler<GetAgeLevelsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAgeLevelsQuery) {
    const ageLevels = await this.prisma.boardAgeLevel.findMany({
      where: {
        voided: false,
      },
      select: {
        ageLevelName: true,
      },
      distinct: ['ageLevelName'],
    });

    return {
      message: 'Age levels retrieved successfully',
      data: ageLevels.map((item) => item.ageLevelName),
    };
  }
}
