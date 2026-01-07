import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubjectPerformanceQuery } from '../get-subject-performance.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QuestionFor, Subject, SubmissionType } from '@prisma/client';

// ==================== Interfaces ====================

interface ModulePerformance {
  moduleId: string;
  moduleName: string;
  testQuestionsAttempted: number;
  testQuestionsCorrect: number;
  totalMarksObtained: number;
  totalMarksPossible: number;
  accuracyPercentage: number;
  performancePercentage: number;
  averageScore: number;
}

interface SubjectPerformance {
  subject: Subject;
  testQuestionsAttempted: number;
  testQuestionsCorrect: number;
  totalMarksObtained: number;
  totalMarksPossible: number;
  accuracyPercentage: number;
  performancePercentage: number;
  averageScore: number;
  modules: ModulePerformance[];
}

interface SubjectPerformanceResponse {
  studentId: string;
  studentName: string;
  overallPerformance: {
    // testQuestionsAttempted: number;
    // testQuestionsCorrect: number;
    // totalMarksObtained: number;
    // totalMarksPossible: number;
    // accuracyPercentage: number;
    performancePercentage: number;
    // averageScore: number;
  };
  subjects: SubjectPerformance[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

// ==================== Handler ====================

@QueryHandler(GetSubjectPerformanceQuery)
export class GetSubjectPerformanceHandler implements IQueryHandler<GetSubjectPerformanceQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetSubjectPerformanceQuery,
  ): Promise<SubjectPerformanceResponse> {
    const { studentId, subject, startDate, endDate } = query;

    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const currentEnd = endDate || new Date();
    const currentStart = startDate || new Date(0); // Beginning of time if not specified

    // Build where clause - only Exam submissions for performance
    const whereClause: any = {
      studentId,
      type: SubmissionType.Exam,
      question: {
        questionFor: QuestionFor.Test,
      },
      beganAt: {
        gte: currentStart,
        lte: currentEnd,
      },
      // Only consider submitted or graded submissions
      status: {
        in: ['Submitted', 'Graded'],
      },
    };

    if (subject) {
      whereClause.question.module = {
        subject: subject as Subject,
      };
    }

    // Get all test/exam submissions
    const testSubmissions = await this.prisma.submission.findMany({
      where: whereClause,
      include: {
        question: {
          include: {
            module: true,
          },
        },
      },
    });

    // Group by subject and module
    const subjectMap = new Map<Subject, Map<string, ModulePerformance>>();

    // Process submissions and build performance data
    for (const submission of testSubmissions) {
      if (!submission.question.module) continue;

      const subj = submission.question.module.subject;
      const moduleId = submission.question.module.id;
      const moduleName = submission.question.module.name;

      // Initialize subject map
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, new Map());
      }

      const moduleMap = subjectMap.get(subj)!;

      // Initialize module performance
      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, {
          moduleId,
          moduleName,
          testQuestionsAttempted: 0,
          testQuestionsCorrect: 0,
          totalMarksObtained: 0,
          totalMarksPossible: 0,
          accuracyPercentage: 0,
          performancePercentage: 0,
          averageScore: 0,
        });
      }

      const modulePerf = moduleMap.get(moduleId)!;

      // Update counts
      modulePerf.testQuestionsAttempted++;

      // Count correct answers
      if (submission.correctAnswersCount) {
        // If the question has all correct answers
        // Assuming if correctAnswersCount equals total answers, it's correct
        // You may need to adjust this logic based on your grading system
        modulePerf.testQuestionsCorrect += submission.correctAnswersCount;
      }

      // Update marks
      const marksObtained = submission.awardedMarks || 0;
      const totalMarks = submission.question.totalMarks || 0;

      modulePerf.totalMarksObtained += marksObtained;
      modulePerf.totalMarksPossible += totalMarks;
    }

    // Calculate percentages for each module
    for (const [subj, moduleMap] of subjectMap.entries()) {
      for (const [moduleId, modulePerf] of moduleMap.entries()) {
        // Accuracy percentage (correct answers / attempted)
        modulePerf.accuracyPercentage =
          modulePerf.testQuestionsAttempted > 0
            ? Math.round(
                (modulePerf.testQuestionsCorrect /
                  modulePerf.testQuestionsAttempted) *
                  100,
              )
            : 0;

        // Performance percentage (marks obtained / marks possible)
        modulePerf.performancePercentage =
          modulePerf.totalMarksPossible > 0
            ? Math.round(
                (modulePerf.totalMarksObtained /
                  modulePerf.totalMarksPossible) *
                  100,
              )
            : 0;

        // Average score
        modulePerf.averageScore =
          modulePerf.testQuestionsAttempted > 0
            ? Math.round(
                (modulePerf.totalMarksObtained /
                  modulePerf.testQuestionsAttempted) *
                  100,
              ) / 100
            : 0;
      }
    }

    // Build subject-level aggregates
    const subjects: SubjectPerformance[] = [];
    let overallAttempted = 0;
    let overallCorrect = 0;
    let overallMarksObtained = 0;
    let overallMarksPossible = 0;

    for (const [subj, moduleMap] of subjectMap.entries()) {
      const modules = Array.from(moduleMap.values());

      const subjectAttempted = modules.reduce(
        (sum, m) => sum + m.testQuestionsAttempted,
        0,
      );
      const subjectCorrect = modules.reduce(
        (sum, m) => sum + m.testQuestionsCorrect,
        0,
      );
      const subjectMarksObtained = modules.reduce(
        (sum, m) => sum + m.totalMarksObtained,
        0,
      );
      const subjectMarksPossible = modules.reduce(
        (sum, m) => sum + m.totalMarksPossible,
        0,
      );

      const accuracyPercentage =
        subjectAttempted > 0
          ? Math.round((subjectCorrect / subjectAttempted) * 100)
          : 0;

      const performancePercentage =
        subjectMarksPossible > 0
          ? Math.round((subjectMarksObtained / subjectMarksPossible) * 100)
          : 0;

      const averageScore =
        subjectAttempted > 0
          ? Math.round((subjectMarksObtained / subjectAttempted) * 100) / 100
          : 0;

      subjects.push({
        subject: subj,
        testQuestionsAttempted: subjectAttempted,
        testQuestionsCorrect: subjectCorrect,
        totalMarksObtained: subjectMarksObtained,
        totalMarksPossible: subjectMarksPossible,
        accuracyPercentage,
        performancePercentage,
        averageScore,
        modules,
      });

      overallAttempted += subjectAttempted;
      overallCorrect += subjectCorrect;
      overallMarksObtained += subjectMarksObtained;
      overallMarksPossible += subjectMarksPossible;
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      overallPerformance: {
        // testQuestionsAttempted: overallAttempted,
        // testQuestionsCorrect: overallCorrect,
        // totalMarksObtained: overallMarksObtained,
        // totalMarksPossible: overallMarksPossible,
        // accuracyPercentage:
        //   overallAttempted > 0
        //     ? Math.round((overallCorrect / overallAttempted) * 100)
        //     : 0,
        performancePercentage:
          overallMarksPossible > 0
            ? Math.round((overallMarksObtained / overallMarksPossible) * 100)
            : 0,
        // averageScore:
        //   overallAttempted > 0
        //     ? Math.round((overallMarksObtained / overallAttempted) * 100) / 100
        //     : 0,
      },
      subjects,
      dateRange: {
        startDate: currentStart,
        endDate: currentEnd,
      },
    };
  }
}
