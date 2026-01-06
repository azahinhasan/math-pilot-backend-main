import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExamSolutionsQuery } from '../get-exam-solutions.query';
import { NotFoundException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Handler for the GetExamSolutionsQuery.
 * Retrieves all questions and their solutions associated with an exam through its question sets.
 */
@Injectable()
@QueryHandler(GetExamSolutionsQuery)
export class GetExamSolutionsHandler implements IQueryHandler<GetExamSolutionsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetExamSolutionsQuery) {
    const { examId } = query;

    // 1. Check if the exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, name: true },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // 2. Fetch all questions and their solutions via the exam's question sets
    const questionSets = await this.prisma.questionSet.findMany({
      where: {
        examId: examId,
        voided: false,
      },
      include: {
        question: {
          include: {
            solutionBases: {
              include: {
                solutionMCQs: {
                  where: { voided: false },
                },
                solutionDescriptives: {
                  where: { voided: false },
                },
                solutionMatchingPairs: {
                  where: { voided: false },
                },
              },
            },
          },
        },
      },
      orderBy: {
        serialNo: 'asc',
      },
    });

    // 3. Extract and format the data
    const questionsWithSolutions = questionSets
      .filter((qs) => qs.question) // Ensure there's a question record linked to the question set
      .map((qs) => {
        const question = qs.question!; // Safe assertion after filter
        const solutionBase = question.solutionBases[0]; // Assuming single solution base active

        let type = 'Unknown';
        if (solutionBase) {
          if (solutionBase.solutionMCQs?.length > 0) {
            const mcqs = solutionBase.solutionMCQs;
            const hasTrue = mcqs.some(
              (m) => m.optionText.trim().toUpperCase() === 'TRUE',
            );
            const hasFalse = mcqs.some(
              (m) => m.optionText.trim().toUpperCase() === 'FALSE',
            );

            if (mcqs.length === 2 && hasTrue && hasFalse) {
              type = 'Boolean';
            } else {
              type = 'MCQ';
            }
          } else if (solutionBase.solutionMatchingPairs?.length > 0) {
            type = 'Matching';
          } else if (solutionBase.solutionDescriptives?.length > 0) {
            const desc = solutionBase.solutionDescriptives[0];
            type = desc.isInputCanvases ? 'Descriptive' : 'ShortAnswer';
          }
        }

        return {
          questionId: qs.questionId,
          serialNo: qs.serialNo,
          name: question.name,
          type,
          questionText: question.questionText,
          // solutionBases contains the actual answers/marking schemes
          solutions: question.solutionBases,
        };
      });

    return {
      message: 'Exam solutions retrieved successfully',
      examId: exam.id,
      examName: exam.name,
      totalQuestions: questionsWithSolutions.length,
      data: questionsWithSolutions,
    };
  }
}
