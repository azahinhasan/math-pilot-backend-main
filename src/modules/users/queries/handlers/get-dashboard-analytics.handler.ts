import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDashboardAnalyticsQuery } from '../get-dashboard-analytics.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SubmissionStatus, SubmissionType } from '@prisma/client';

// ==================== Interfaces ====================

interface SummaryCard {
  label: string;
  value: string | number;
  changePercentage: number;
  changeLabel: string;
}

interface RecentExamPerformance {
  examId: string;
  examName: string;
  module: string;
  questionsCount: number;
  date: Date;
  timeSpent: number; // in minutes
  score: number; // awarded marks
  totalMarks: number;
  scorePercentage: number;
  status: 'Completed' | 'Marking' | 'In Progress';
}

interface TopicPerformance {
  topicName: string;
  accuracyPercentage: number;
  questionsAttempted: number;
  examsCompleted: number;
}

interface DashboardAnalytics {
  summaryCards: {
    examsCompleted: SummaryCard;
    averageScore: SummaryCard;
    questionsPracticed: SummaryCard;
    studyTime: SummaryCard;
  };
  recentPerformance: RecentExamPerformance[];
  topicPerformance: TopicPerformance[];
}

// ==================== Handler ====================

@QueryHandler(GetDashboardAnalyticsQuery)
export class GetDashboardAnalyticsHandler
  implements IQueryHandler<GetDashboardAnalyticsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetDashboardAnalyticsQuery,
  ): Promise<DashboardAnalytics> {
    const { studentId, startDate, endDate } = query;

    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    // Set date ranges
    const currentEnd = endDate || new Date();
    const currentStart = startDate || this.getStartOfMonth(currentEnd);

    // Calculate previous period dates (same duration as current period)
    const periodDuration = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - periodDuration);

    // Fetch data for current and previous periods
    const [
      currentSubmissions,
      previousSubmissions,
      topicProgress,
      allSubmissions,
    ] = await Promise.all([
      this.getSubmissions(studentId, currentStart, currentEnd),
      this.getSubmissions(studentId, previousStart, previousEnd),
      this.prisma.studentTopicProgress.findMany({
        where: { studentId },
        include: {
          topic: {
            include: {
              module: true,
            },
          },
        },
      }),
      this.getSubmissions(studentId, undefined, currentEnd),
    ]);

    // Calculate summary cards
    const summaryCards = this.calculateSummaryCards(
      currentSubmissions,
      previousSubmissions,
      topicProgress,
    );

    // Get recent exam performances
    const recentPerformance =
      await this.getRecentExamPerformances(allSubmissions);

    // Calculate topic performance
    const topicPerformance = this.calculateTopicPerformance(
      allSubmissions,
      topicProgress,
    );

    return {
      summaryCards,
      recentPerformance,
      topicPerformance,
    };
  }

  private getStartOfMonth(date: Date): Date {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private async getSubmissions(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const whereClause: any = {
      studentId,
      voided: false,
    };

    if (startDate || endDate) {
      whereClause.beganAt = {};
      if (startDate) whereClause.beganAt.gte = startDate;
      if (endDate) whereClause.beganAt.lte = endDate;
    }

    return this.prisma.submission.findMany({
      where: whereClause,
      include: {
        question: {
          include: {
            topic: {
              include: {
                module: true,
              },
            },
            module: true,
          },
        },
      },
      orderBy: {
        beganAt: 'desc',
      },
    });
  }

  private calculateSummaryCards(
    currentSubmissions: any[],
    previousSubmissions: any[],
    topicProgress: any[],
  ) {
    // Exams Completed
    const currentExams = currentSubmissions.filter(
      (s) =>
        s.type === SubmissionType.Exam && s.status === SubmissionStatus.Graded,
    ).length;
    const previousExams = previousSubmissions.filter(
      (s) =>
        s.type === SubmissionType.Exam && s.status === SubmissionStatus.Graded,
    ).length;
    const examsChange = this.calculatePercentageChange(
      currentExams,
      previousExams,
    );

    // Average Score
    const currentGradedSubmissions = currentSubmissions.filter(
      (s) => s.status === SubmissionStatus.Graded && s.question?.totalMarks,
    );
    const currentAverageScore =
      currentGradedSubmissions.length > 0
        ? currentGradedSubmissions.reduce((sum, s) => {
            const percentage =
              ((s.awardedMarks || 0) / s.question.totalMarks) * 100;
            return sum + percentage;
          }, 0) / currentGradedSubmissions.length
        : 0;

    const previousGradedSubmissions = previousSubmissions.filter(
      (s) => s.status === SubmissionStatus.Graded && s.question?.totalMarks,
    );
    const previousAverageScore =
      previousGradedSubmissions.length > 0
        ? previousGradedSubmissions.reduce((sum, s) => {
            const percentage =
              ((s.awardedMarks || 0) / s.question.totalMarks) * 100;
            return sum + percentage;
          }, 0) / previousGradedSubmissions.length
        : 0;
    const scoreChange = this.calculatePercentageChange(
      currentAverageScore,
      previousAverageScore,
    );

    // Questions Practiced
    const currentQuestions = currentSubmissions.length;
    const previousQuestions = previousSubmissions.length;
    const questionsChange = this.calculatePercentageChange(
      currentQuestions,
      previousQuestions,
    );

    // Study Time (in hours)
    const currentStudyTime = this.calculateStudyTime(currentSubmissions);
    const previousStudyTime = this.calculateStudyTime(previousSubmissions);
    const studyTimeChange = this.calculatePercentageChange(
      currentStudyTime,
      previousStudyTime,
    );

    return {
      examsCompleted: {
        label: 'Exams Completed',
        value: currentExams,
        changePercentage: examsChange,
        changeLabel: 'From last month',
      },
      averageScore: {
        label: 'Average Score',
        value: `${Math.round(currentAverageScore)}%`,
        changePercentage: scoreChange,
        changeLabel: 'From last month',
      },
      questionsPracticed: {
        label: 'Questions Practiced',
        value: currentQuestions,
        changePercentage: questionsChange,
        changeLabel: 'From last month',
      },
      studyTime: {
        label: 'Study Time',
        value: `${Math.round(currentStudyTime)}h`,
        changePercentage: studyTimeChange,
        changeLabel: 'From last month',
      },
    };
  }

  private calculateStudyTime(submissions: any[]): number {
    // Calculate total time spent in hours
    const totalSeconds = submissions.reduce((sum, submission) => {
      if (submission.beganAt && submission.endedAt) {
        const duration =
          (new Date(submission.endedAt).getTime() -
            new Date(submission.beganAt).getTime()) /
          1000;
        return sum + duration;
      }
      return sum;
    }, 0);

    return totalSeconds / 3600; // Convert to hours
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  }

  private async getRecentExamPerformances(
    submissions: any[],
  ): Promise<RecentExamPerformance[]> {
    // Filter exam submissions
    const examSubmissions = submissions.filter(
      (s) => s.type === SubmissionType.Exam,
    );

    // Group submissions by examId
    const examGroups = new Map<
      string,
      {
        examId: string | null;
        submissions: any[];
        earliestDate: Date;
      }
    >();

    examSubmissions.forEach((submission) => {
      const examId = submission.examId || 'practice'; // Group non-exam submissions as 'practice'

      if (!examGroups.has(examId)) {
        examGroups.set(examId, {
          examId: submission.examId,
          submissions: [],
          earliestDate: submission.beganAt,
        });
      }

      const group = examGroups.get(examId)!;
      group.submissions.push(submission);

      // Update earliest date if this submission is earlier
      if (submission.beganAt < group.earliestDate) {
        group.earliestDate = submission.beganAt;
      }
    });

    // Convert to array and sort by date (most recent first)
    const sortedExams = Array.from(examGroups.values()).sort(
      (a, b) => b.earliestDate.getTime() - a.earliestDate.getTime(),
    );

    // Filter to only include exams with actual examId (no practice submissions)
    const recentExamsWithId = sortedExams.filter((e) => e.examId !== null);

    // Take the 3 most recent exams
    const recentExams = recentExamsWithId.slice(0, 3);

    // Fetch exam metadata from Exam table
    const examIds = recentExams.map((e) => e.examId) as string[];

    if (examIds.length === 0) {
      return []; // No exams to display
    }

    const examMetadata = await this.prisma.exam.findMany({
      where: {
        id: { in: examIds },
      },
      include: {
        subtopics: {
          include: {
            topic: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    const examMetadataMap = new Map(examMetadata.map((e) => [e.id, e]));

    // Calculate aggregate stats for each exam
    const results = recentExams.map((examGroup) => {
      const submissions = examGroup.submissions;
      const questionsCount = submissions.length;

      // Calculate total marks and awarded marks
      const totalMarks = submissions.reduce(
        (sum, s) => sum + (s.question?.totalMarks || 0),
        0,
      );
      const awardedMarks = submissions.reduce(
        (sum, s) => sum + (s.awardedMarks || 0),
        0,
      );
      const scorePercentage =
        totalMarks > 0 ? (awardedMarks / totalMarks) * 100 : 0;

      // Calculate time spent in minutes (sum of all question times)
      const timeSpent = submissions.reduce((sum, submission) => {
        if (submission.beganAt && submission.endedAt) {
          const duration = Math.round(
            (new Date(submission.endedAt).getTime() -
              new Date(submission.beganAt).getTime()) /
              60000,
          );
          return sum + duration;
        }
        return sum;
      }, 0);

      // Determine overall status based on all submissions
      let status: 'Completed' | 'Marking' | 'In Progress';
      const allGraded = submissions.every(
        (s) => s.status === SubmissionStatus.Graded,
      );
      const anyInProgress = submissions.some(
        (s) => s.status === SubmissionStatus.InProgress,
      );

      if (allGraded) {
        status = 'Completed';
      } else if (anyInProgress) {
        status = 'In Progress';
      } else {
        status = 'Marking';
      }

      // Get exam name and module from Exam table
      if (!examGroup.examId || !examMetadataMap.has(examGroup.examId)) {
        // Skip submissions that don't have a valid examId
        // This ensures we only show actual exams, not practice submissions
        return null;
      }

      const exam = examMetadataMap.get(examGroup.examId)!;
      const examName = exam.name;

      // Get module from exam's subtopics
      let moduleName = 'Unknown Module';
      if (exam.subtopics && exam.subtopics.length > 0) {
        const firstSubtopic = exam.subtopics[0];
        moduleName = firstSubtopic.topic?.module?.name || 'Unknown Module';
      }

      return {
        examId: examGroup.examId!,
        examName,
        module: moduleName,
        questionsCount,
        date: examGroup.earliestDate,
        timeSpent,
        score: awardedMarks,
        totalMarks,
        scorePercentage: parseFloat(scorePercentage.toFixed(2)),
        status,
      };
    });

    // Filter out any null results (shouldn't happen now, but safety check)
    return results.filter((r) => r !== null) as RecentExamPerformance[];
  }

  private calculateTopicPerformance(
    submissions: any[],
    topicProgress: any[],
  ): TopicPerformance[] {
    const topicPerformanceMap = new Map<
      string,
      {
        topicName: string;
        totalCorrect: number;
        totalAttempted: number;
        examsCompleted: number;
      }
    >();

    // Aggregate data from submissions
    submissions.forEach((submission) => {
      const topicId = submission.question?.topicId;
      if (!topicId) return;

      const topicName = submission.question?.topic?.name || 'Unknown';
      const isExam = submission.type === SubmissionType.Exam;
      const isGraded = submission.status === SubmissionStatus.Graded;

      if (!topicPerformanceMap.has(topicId)) {
        topicPerformanceMap.set(topicId, {
          topicName,
          totalCorrect: 0,
          totalAttempted: 0,
          examsCompleted: 0,
        });
      }

      const topicData = topicPerformanceMap.get(topicId)!;
      topicData.totalAttempted++;

      if (isGraded && submission.question?.totalMarks) {
        const percentage =
          (submission.awardedMarks || 0) / submission.question.totalMarks;
        topicData.totalCorrect += percentage;
      }

      if (isExam && isGraded) {
        topicData.examsCompleted++;
      }
    });

    // Merge with topic progress data
    topicProgress.forEach((progress) => {
      const topicId = progress.topicId;
      const topicName = progress.topic?.name || 'Unknown';

      if (!topicPerformanceMap.has(topicId)) {
        topicPerformanceMap.set(topicId, {
          topicName,
          totalCorrect: 0,
          totalAttempted: 0,
          examsCompleted: 0,
        });
      }

      const topicData = topicPerformanceMap.get(topicId)!;
      // Use topic progress data if we have more attempts recorded there
      if (progress.questionsAttempted > topicData.totalAttempted) {
        topicData.totalAttempted = progress.questionsAttempted;
        topicData.totalCorrect = progress.questionsCorrect || 0;
      }
    });

    // Convert to array and calculate accuracy percentage
    const topicPerformances: TopicPerformance[] = Array.from(
      topicPerformanceMap.values(),
    ).map((data) => ({
      topicName: data.topicName,
      accuracyPercentage:
        data.totalAttempted > 0
          ? parseFloat(
              ((data.totalCorrect / data.totalAttempted) * 100).toFixed(2),
            )
          : 0,
      questionsAttempted: data.totalAttempted,
      examsCompleted: data.examsCompleted,
    }));

    // Sort by accuracy percentage (highest to lowest)
    return topicPerformances.sort(
      (a, b) => b.accuracyPercentage - a.accuracyPercentage,
    );
  }
}
