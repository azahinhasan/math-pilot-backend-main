import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetSubmissionsQuery } from '../get-submissions.query';
import { NotFoundException } from '@nestjs/common';

/**
 * Handler for retrieving all practice submissions for a specific question and student.
 * Returns submission history including all attempts with their descriptive answers,
 * canvas data, hints, verdicts, and evaluation results.
 */

@QueryHandler(GetSubmissionsQuery)
export class GetSubmissionsHandler
  implements IQueryHandler<GetSubmissionsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetSubmissionsQuery): Promise<any> {
    const { questionId, clerkId } = query;

    // Find the student by clerkId and ensure they are not voided

    const student = await this.prisma.student.findFirst({
      where: {
        auth: {
          clerkId: clerkId,
        },
        voided: false,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    // Retrieve all practice submissions for this student and question
    // Includes submitted descriptive answers and question details
    // Ordered by most recent first (descending beganAt)

    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId: student.id,
        questionId: questionId,
        type: 'Practice',
        voided: false,
      },
      include: {
        submittedDescriptives: {
          where: {
            voided: false,
          },
          select: {
            id: true,
            descriptiveSubmittedAnswer: true,
            evaluation:true,
            canvasData: true,
            isCorrect: true,
            awardedMarks: true,
            hint: true,
            verdict: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        question: {
          select: {
            id: true,
            name: true,
            questionText: true,
            totalMarks: true,
          },
        },
      },
      orderBy: {
        beganAt: 'desc',
      },
    });

    // Format and return the response with submission history
    return {
      message: 'Submissions retrieved successfully',
      totalSubmissions: submissions.length,
      data: submissions,
    };
  }
}
