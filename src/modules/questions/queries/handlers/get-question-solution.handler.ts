import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuestionSolutionQuery } from '../get-question-solution.query';
import { NotFoundException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetQuestionSolutionQuery)
export class GetQuestionSolutionHandler
  implements IQueryHandler<GetQuestionSolutionQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes the query to fetch the solution for a question.
   * Includes MCQ options, descriptive solutions, and matching pairs if available.
   * @param query The query containing the questionId.
   */
  async execute(query: GetQuestionSolutionQuery) {
    const { questionId } = query;

    // Fetch the solution from the SolutionBase table with related content
    const solution = await this.prisma.solutionBase.findUnique({
      where: {
        questionId: questionId,
      },
      include: {
        // Filter out voided records for all solution types
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
        solutionMatchingPairs: {
          where: {
            voided: false,
          },
        },
      },
    });

    // If no solution entry exists for this question, throw a 404
    if (!solution) {
      throw new NotFoundException(
        `Solution for question with ID ${questionId} not found`,
      );
    }

    return {
      message: 'Solution retrieved successfully',
      data: solution,
    };
  }
}

