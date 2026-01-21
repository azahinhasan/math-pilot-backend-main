import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetMockPastPapersQuery } from '../get-mock-past-papers.query';

@QueryHandler(GetMockPastPapersQuery)
export class GetMockPastPapersHandler implements IQueryHandler<GetMockPastPapersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMockPastPapersQuery) {
    const { moduleId, boardId } = query;

    const where: any = {
      voided: false,
    };

    if (moduleId) {
      where.moduleId = moduleId;
    }

    if (boardId) {
      where.boardId = boardId;
    }

    const pastPapers = await this.prisma.pastPaper.findMany({
      where,
      include: {
        board: true,
        questionSets: {
          where: {
            questionId: { not: null },
            voided: false,
          },
          select: {
            questionId: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { season: 'asc' }, { name: 'asc' }],
    });

    const data = pastPapers.map((paper) => {
      const uniqueQuestions = new Set(
        paper.questionSets.map((qs) => qs.questionId),
      );
      return {
        id: paper.id,
        name: paper.name,
        year: paper.year,
        season: paper.season,
        timeLimit: paper.timeLimit,
        numberOfQuestions: uniqueQuestions.size,
        board: paper.board
          ? {
              id: paper.board.id,
              boardName: paper.board.boardName,
              ageLevelName: paper.board.ageLevelName,
            }
          : null,
        moduleId: paper.moduleId,
      };
    });

    return {
      message: 'Mock Past Papers Fetched Successfully',
      data,
    };
  }
}
