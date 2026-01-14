import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExamSubmissionsQuery } from '../get-exam-submissions.query';
import { NotFoundException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmissionType, SubmissionStatus } from '@prisma/client';

@Injectable()
@QueryHandler(GetExamSubmissionsQuery)
export class GetExamSubmissionsHandler implements IQueryHandler<GetExamSubmissionsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetExamSubmissionsQuery) {
    const { examId, studentId } = query;

    // 1. Check if the exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, name: true, timeLimit: true },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // 2. Fetch all questions for the exam
    const questionSets = await this.prisma.questionSet.findMany({
      where: {
        examId: examId,
        voided: false,
      },
      include: {
        question: {
          select: {
            id: true,
            name: true,
            questionText: true,
            imageFileName: true,
            // We might need solutionBase to determine type if needed, but the prompt implies flattening submission
            solutionBases: {
              select: {
                id: true,
                solutionMCQs: {
                  where: { voided: false },
                },
                solutionMatchingPairs: {
                  where: { voided: false },
                },
                solutionDescriptives: {
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

    let totalQuestions = 0;

    // Aggregation Variables for Current ("Latest")
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnattempted = 0;
    let totalTimeTaken = 0;
    let totalAnswered = 0;

    // Aggregation Variables for Previous
    let prevTotalCorrect = 0;
    let prevTotalIncorrect = 0;
    let prevTotalUnattempted = 0;
    let hasPreviousData = false;
    let prevSampleCount = 0; // To track if we found any previous submissions to establish a baseline

    const questionsWithSubmissions = await Promise.all(
      questionSets
        .filter((qs) => qs.question)
        .map(async (qs) => {
          const question = qs.question!;
          totalQuestions++;

          // Fetch submissions for this question
          const submissions = await this.prisma.submission.findMany({
            where: {
              studentId,
              questionId: question.id,
              type: SubmissionType.Exam,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            include: {
              submittedAnswers: {
                include: {
                  submittedMatchingPairs: true,
                },
              },
              submittedMcqs: true,
              submittedDescriptives: true,
            },
          });

          const isUnattempted = submissions.length === 0;

          // Find Latest Graded Submission
          const latestGraded = submissions.find(
            (s) => s.status === SubmissionStatus.Graded,
          );

          // Find Previous Graded Submission (after the latest one)
          let previousGraded: typeof latestGraded | undefined | null = null;
          if (latestGraded) {
            const latestIndex = submissions.indexOf(latestGraded);
            previousGraded = submissions
              .slice(latestIndex + 1)
              .find((s) => s.status === SubmissionStatus.Graded);
          }

          // --- Aggregation Logic ---

          // Current Aggregation
          if (isUnattempted) {
            totalUnattempted++;
          } else {
            // Even if it exists, if it's not graded, do we count it as unattempted?
            // "If no submission is found regardless of any status at all then the question was unattempted."
            // This implies if a submission is found (even in progress), it is NOT unattempted.
            // But if it's not graded, it doesn't contribute to correct/incorrect.

            if (latestGraded) {
              totalAnswered++;

              // Time taken is usually on SubmittedAnswer
              const sa = latestGraded.submittedAnswers?.[0];
              if (sa && sa.timeTakenInSeconds) {
                totalTimeTaken += sa.timeTakenInSeconds;
              }

              // Check correctness
              let isCorrect = false;

              // Check MCQs (Directly on Submission)
              if (
                latestGraded.submittedMcqs &&
                latestGraded.submittedMcqs.length > 0
              ) {
                if (latestGraded.submittedMcqs.every((m) => m.isCorrect)) {
                  isCorrect = true;
                }
              }
              // Check Descriptives (Directly on Submission)
              else if (
                latestGraded.submittedDescriptives &&
                latestGraded.submittedDescriptives.length > 0
              ) {
                if (
                  latestGraded.submittedDescriptives.every((d) => d.isCorrect)
                ) {
                  isCorrect = true;
                }
              }
              // Check Matching Pairs (On SubmittedAnswer)
              else if (
                sa &&
                sa.submittedMatchingPairs &&
                sa.submittedMatchingPairs.length > 0
              ) {
                // Matching pairs logic - for now assume false or check logic if needed
                // If we don't have isCorrect, we might skip or check marks.
                // For now leaving as false to avoid TS error if property missing, or check if any logic exists.
              }

              if (isCorrect) {
                totalCorrect++;
              } else {
                totalIncorrect++;
              }
            } else {
              // Submission exists but not graded.
              // It is attempted. But result is unknown.
            }
          }

          // Previous Aggregation
          if (previousGraded) {
            hasPreviousData = true;
            prevSampleCount++;

            let isCorrectPrev = false;

            // Check MCQs (Directly on Submission)
            if (
              previousGraded.submittedMcqs &&
              previousGraded.submittedMcqs.length > 0
            ) {
              if (previousGraded.submittedMcqs.every((m) => m.isCorrect))
                isCorrectPrev = true;
            }
            // Check Descriptives (Directly on Submission)
            else if (
              previousGraded.submittedDescriptives &&
              previousGraded.submittedDescriptives.length > 0
            ) {
              if (
                previousGraded.submittedDescriptives.every((d) => d.isCorrect)
              )
                isCorrectPrev = true;
            }

            if (isCorrectPrev) prevTotalCorrect++;
            else prevTotalIncorrect++;
          } else {
            // No previous submission found for this question.
            // If `prevSampleCount > 0` (indicating a previous exam attempt exists),
            // this question contributes to `prevTotalUnattempted` in the final aggregation.
          }

          // Format Response for this Question
          // Determine Question Type
          const solutionBase = question.solutionBases[0];
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

          // Flatten Solutions Data (matches GetExamSolutionsHandler logic)
          const solutions = question.solutionBases.flatMap((sb): any[] => {
            if (sb.solutionMCQs?.length > 0) {
              return sb.solutionMCQs;
            } else if (sb.solutionDescriptives?.length > 0) {
              return sb.solutionDescriptives.map((sd) => ({
                ...sd,
                mark: sd.maxMarks,
              }));
            } else if (sb.solutionMatchingPairs?.length > 0) {
              return sb.solutionMatchingPairs;
            }
            return [];
          });

          // Flatten Submission Data
          let flattenedSubmission: any = null;
          if (latestGraded) {
            // Helper to build the flat object
            const buildFlat = (details: any, typeSpecificData: any) => {
              let optionId = null;
              if (typeSpecificData.submittedOption) {
                const match = solutions.find(
                  (s: any) => s.optionText === typeSpecificData.submittedOption,
                );
                if (match) optionId = match.id;
              }

              return {
                id: typeSpecificData.id,
                optionId,
                submittedAnswerId: latestGraded.submittedAnswers?.[0]?.id,
                submissionId: latestGraded.id,
                solutionId: typeSpecificData.solutionId,

                // Type specific fields
                submittedOption: typeSpecificData.submittedOption, // MCQ/Boolean
                descriptiveSubmittedAnswer:
                  typeSpecificData.descriptiveSubmittedAnswer, // Descriptive

                isCorrect: typeSpecificData.isCorrect,
                awardedMark:
                  typeSpecificData.awardedMark ?? typeSpecificData.awardedMarks,

                timeTakenInSeconds:
                  latestGraded.submittedAnswers?.[0]?.timeTakenInSeconds,
                createdAt: typeSpecificData.createdAt,
                updatedAt: typeSpecificData.updatedAt,
                voided: typeSpecificData.voided,

                // Descriptive extras if needed
                verdict: typeSpecificData.verdict,
                evaluation: typeSpecificData.evaluation,
              };
            };

            if (latestGraded.submittedMcqs?.length > 0) {
              const mcq = latestGraded.submittedMcqs[0];
              flattenedSubmission = buildFlat(latestGraded, mcq);
            } else if (latestGraded.submittedDescriptives?.length > 0) {
              const desc = latestGraded.submittedDescriptives[0];
              flattenedSubmission = buildFlat(latestGraded, desc);
            } else if (
              latestGraded.submittedAnswers?.[0]?.submittedMatchingPairs
                ?.length > 0
            ) {
              // Matching pairs logic is complex to flatten into single fields, skipping for now unless needed
              // If needed we would probably pick the first pair or aggregate
            }
          }

          return {
            questionId: qs.questionId,
            serialNo: qs.serialNo,
            name: question.name,
            type,
            questionText: question.questionText,
            imageFileName: question.imageFileName,
            solutions,
            isUnattempted,
            submission: flattenedSubmission,
          };
        }),
    );

    // Finalize Aggregation
    const totalAnsweredOrGraded = totalCorrect + totalIncorrect; // Should match totalAnswered effectively if all graded are marked correct/incorrect

    // Check if we should report previous stats
    // We assume if `prevSampleCount > 0`, there was a previous attempt.
    // In that case, `prevTotalUnattempted` = `totalQuestions` - `prevTotalCorrect` - `prevTotalIncorrect`.
    if (prevSampleCount > 0) {
      prevTotalUnattempted =
        totalQuestions - prevTotalCorrect - prevTotalIncorrect;
    }

    const currentStats = {
      correctPercentage:
        totalAnsweredOrGraded > 0
          ? (totalCorrect / totalAnsweredOrGraded) * 100
          : 0,
      incorrectPercentage:
        totalAnsweredOrGraded > 0
          ? (totalIncorrect / totalAnsweredOrGraded) * 100
          : 0,
      unattemptedCount: totalUnattempted,
      totalTimeTaken,
    };

    let comparison: {
      correctPercentageDiff: number;
      incorrectPercentageDiff: number;
      unattemptedCountDiff: number;
    } | null = null;
    if (prevSampleCount > 0) {
      const prevTotalAnswered = prevTotalCorrect + prevTotalIncorrect;
      const prevCorrectPct =
        prevTotalAnswered > 0
          ? (prevTotalCorrect / prevTotalAnswered) * 100
          : 0;
      const prevIncorrectPct =
        prevTotalAnswered > 0
          ? (prevTotalIncorrect / prevTotalAnswered) * 100
          : 0;

      comparison = {
        correctPercentageDiff: currentStats.correctPercentage - prevCorrectPct,
        incorrectPercentageDiff:
          currentStats.incorrectPercentage - prevIncorrectPct,
        unattemptedCountDiff:
          currentStats.unattemptedCount - prevTotalUnattempted,
      };
    }

    return {
      message: 'Exam submissions retrieved successfully',
      examId: exam.id,
      examName: exam.name,
      timeLimitInSeconds: exam.timeLimit ? exam.timeLimit * 60 : null,
      totalQuestions,
      aggregatedData: {
        ...currentStats,
        comparison,
      },
      data: questionsWithSubmissions,
    };
  }
}
