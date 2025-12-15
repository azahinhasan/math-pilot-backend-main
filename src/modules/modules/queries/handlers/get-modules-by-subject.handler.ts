import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetModulesBySubjectQuery } from '../get-modules-by-subject.query';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetModulesBySubjectQuery)
export class GetModulesBySubjectHandler
  implements IQueryHandler<GetModulesBySubjectQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetModulesBySubjectQuery) {
    const { subject, clerkId } = query;

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

    console.log('Auth Data:', authData,clerkId);
    console.log('Student Board:', authData?.student?.boardAgeLevel);

    const modules = await this.prisma.module.findMany({
      where: {
        subject,
        voided: false,
      },
      include: {
        boardAgeLevel: {
          select: {
            boardName: true,
            ageLevelName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Modules retrieved successfully',
      subject,
      data: modules,
    };
  }
}
