import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubjectProgressQuery } from '../get-subject-progress.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QuestionFor, Subject } from '@prisma/client';

// ==================== Interfaces ====================

interface ModuleProgressStats {
  moduleId: string;
  moduleName: string;
  totalPracticeQuestions: number;
  attemptedPracticeQuestions: number;
  completedPracticeQuestions: number;
  progressPercentage: number;
  timeSpentInSeconds: number;
}

interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  // totalPracticeQuestions: number;
  // attemptedPracticeQuestions: number;
  // completedPracticeQuestions: number;
  progressPercentage: number;
  // timeSpentInSeconds: number;
}

interface SubjectProgress {
  subject: Subject;
  // totalPracticeQuestions: number;
  // attemptedPracticeQuestions: number;
  // completedPracticeQuestions: number;
  progressPercentage: number;
  // timeSpentInSeconds: number;
  modules: ModuleProgress[];
}

interface SubjectProgressResponse {
  studentId: string;
  studentName: string;
  overallProgress: {
    // totalPracticeQuestions: number;
    // attemptedPracticeQuestions: number;
    // completedPracticeQuestions: number;
    progressPercentage: number;
  };
  subjects: SubjectProgress[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

// ==================== Handler ====================

@QueryHandler(GetSubjectProgressQuery)
export class GetSubjectProgressHandler implements IQueryHandler<GetSubjectProgressQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetSubjectProgressQuery,
  ): Promise<SubjectProgressResponse> {
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

    // Build where clause for filtering
    const whereClause: any = {
      studentId,
      question: {
        questionFor: QuestionFor.Practice,
      },
      beganAt: {
        gte: currentStart,
        lte: currentEnd,
      },
    };

    if (subject) {
      whereClause.question.module = {
        subject: subject as Subject,
      };
    }

    // Get all practice submissions
    const practiceSubmissions = await this.prisma.submission.findMany({
      where: whereClause,
      include: {
        question: {
          include: {
            module: true,
            topic: true,
          },
        },
      },
    });

    // Get all available practice questions (for calculating total)
    const practiceQuestionsWhere: any = {
      questionFor: QuestionFor.Practice,
      voided: false,
    };

    if (subject) {
      practiceQuestionsWhere.module = {
        subject: subject as Subject,
      };
    }

    const allPracticeQuestions = await this.prisma.question.findMany({
      where: practiceQuestionsWhere,
      include: {
        module: true,
      },
    });

    // Group by subject and module
    const subjectMap = new Map<Subject, Map<string, ModuleProgressStats>>();

    // Initialize with all available questions
    for (const question of allPracticeQuestions) {
      if (!question.module) continue;

      const subj = question.module.subject;
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, new Map());
      }

      const moduleMap = subjectMap.get(subj)!;
      if (!moduleMap.has(question.module.id)) {
        moduleMap.set(question.module.id, {
          moduleId: question.module.id,
          moduleName: question.module.name,
          totalPracticeQuestions: 0,
          attemptedPracticeQuestions: 0,
          completedPracticeQuestions: 0,
          progressPercentage: 0,
          timeSpentInSeconds: 0,
        });
      }

      const moduleProgress = moduleMap.get(question.module.id)!;
      moduleProgress.totalPracticeQuestions++;
    }

    // Track unique questions attempted per module
    const moduleAttemptedQuestions = new Map<string, Set<string>>();
    const moduleCompletedQuestions = new Map<string, Set<string>>();

    // Process submissions
    for (const submission of practiceSubmissions) {
      if (!submission.question.module) continue;

      const moduleId = submission.question.module.id;
      const questionId = submission.question.id;

      // Track attempted questions
      if (!moduleAttemptedQuestions.has(moduleId)) {
        moduleAttemptedQuestions.set(moduleId, new Set());
      }
      moduleAttemptedQuestions.get(moduleId)!.add(questionId);

      // Track completed questions (status = Submitted or Graded)
      if (submission.status === 'Submitted' || submission.status === 'Graded') {
        if (!moduleCompletedQuestions.has(moduleId)) {
          moduleCompletedQuestions.set(moduleId, new Set());
        }
        moduleCompletedQuestions.get(moduleId)!.add(questionId);
      }
    }

    // Get time spent from StudentTopicProgress
    const topicProgressData = await this.prisma.studentTopicDetails.findMany({
      where: {
        studentId,
        ...(startDate || endDate
          ? {
              lastAccessedAt: {
                ...(startDate && { gte: currentStart }),
                ...(endDate && { lte: currentEnd }),
              },
            }
          : {}),
      },
      include: {
        topic: {
          include: {
            module: true,
          },
        },
      },
    });

    // Aggregate time spent by module
    const moduleTimeSpent = new Map<string, number>();
    for (const progress of topicProgressData) {
      if (!progress.topic.module) continue;

      const moduleId = progress.topic.module.id;
      const currentTime = moduleTimeSpent.get(moduleId) || 0;
      moduleTimeSpent.set(moduleId, currentTime + progress.timeSpentInSeconds);
    }

    // Update progress with actual data
    for (const [subj, moduleMap] of subjectMap.entries()) {
      for (const [moduleId, moduleProgress] of moduleMap.entries()) {
        const attemptedSet = moduleAttemptedQuestions.get(moduleId);
        const completedSet = moduleCompletedQuestions.get(moduleId);

        moduleProgress.attemptedPracticeQuestions = attemptedSet?.size || 0;
        moduleProgress.completedPracticeQuestions = completedSet?.size || 0;
        moduleProgress.timeSpentInSeconds = moduleTimeSpent.get(moduleId) || 0;

        moduleProgress.progressPercentage =
          moduleProgress.totalPracticeQuestions > 0
            ? Math.round(
                (moduleProgress.completedPracticeQuestions /
                  moduleProgress.totalPracticeQuestions) *
                  100,
              )
            : 0;
      }
    }

    // Build subject-level aggregates
    const subjects: SubjectProgress[] = [];
    let overallTotalQuestions = 0;
    let overallAttemptedQuestions = 0;
    let overallCompletedQuestions = 0;

    for (const [subj, moduleMap] of subjectMap.entries()) {
      const modules = Array.from(moduleMap.values());

      const subjectTotal = modules.reduce(
        (sum, m) => sum + m.totalPracticeQuestions,
        0,
      );
      const subjectAttempted = modules.reduce(
        (sum, m) => sum + m.attemptedPracticeQuestions,
        0,
      );
      const subjectCompleted = modules.reduce(
        (sum, m) => sum + m.completedPracticeQuestions,
        0,
      );
      const subjectTimeSpent = modules.reduce(
        (sum, m) => sum + m.timeSpentInSeconds,
        0,
      );

      subjects.push({
        subject: subj,
        // totalPracticeQuestions: subjectTotal,
        // attemptedPracticeQuestions: subjectAttempted,
        // completedPracticeQuestions: subjectCompleted,
        progressPercentage:
          subjectTotal > 0
            ? Math.round((subjectCompleted / subjectTotal) * 100)
            : 0,
        // timeSpentInSeconds: subjectTimeSpent,
        modules: modules.map((m) => ({
          moduleId: m.moduleId,
          moduleName: m.moduleName,
          // totalPracticeQuestions: m.totalPracticeQuestions,
          // attemptedPracticeQuestions: m.attemptedPracticeQuestions,
          // completedPracticeQuestions: m.completedPracticeQuestions,
          progressPercentage: m.progressPercentage,
          // timeSpentInSeconds: m.timeSpentInSeconds,
        })),
      });

      overallTotalQuestions += subjectTotal;
      overallAttemptedQuestions += subjectAttempted;
      overallCompletedQuestions += subjectCompleted;
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      overallProgress: {
        // totalPracticeQuestions: overallTotalQuestions,
        // attemptedPracticeQuestions: overallAttemptedQuestions,
        // completedPracticeQuestions: overallCompletedQuestions,
        progressPercentage:
          overallTotalQuestions > 0
            ? Math.round(
                (overallCompletedQuestions / overallTotalQuestions) * 100,
              )
            : 0,
      },
      subjects,
      dateRange: {
        startDate: currentStart,
        endDate: currentEnd,
      },
    };
  }
}
