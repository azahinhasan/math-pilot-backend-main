import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetMockPastPapersQuery } from '../get-mock-past-papers.query';

@QueryHandler(GetMockPastPapersQuery)
export class GetMockPastPapersHandler implements IQueryHandler<GetMockPastPapersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMockPastPapersQuery) {
    const { clerkId, moduleId, boardId } = query;

    const auth = await this.prisma.auth.findUnique({
      where: { clerkId },
      include: { student: true },
    });

    const studentId = auth?.student?.id;

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

    let attemptedPastPaperIds: Set<string> = new Set();

    if (studentId) {
      const submissions = await this.prisma.submission.findMany({
        where: {
          studentId: studentId,
          examId: { not: null },
          voided: false,
        },
        select: {
          examId: true,
        },
        distinct: ['examId'],
      });

      const examIds = submissions
        .map((s) => s.examId)
        .filter((id): id is string => id !== null);

      if (examIds.length > 0) {
        const examsWithPastPapers = await this.prisma.exam.findMany({
          where: {
            id: { in: examIds },
            voided: false,
          },
          select: {
            id: true,
            name: true,
          },
        });

        for (const exam of examsWithPastPapers) {
          const pastPaperMatch = pastPapers.find(
            (pp) => exam.name === pp.name || exam.name.includes(pp.name),
          );
          if (pastPaperMatch) {
            attemptedPastPaperIds.add(pastPaperMatch.id);
          }
        }
      }
    }

    const data = pastPapers
      .filter((paper) => {
        if (!studentId) return true;
        return !attemptedPastPaperIds.has(paper.id);
      })
      .map((paper) => {
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
