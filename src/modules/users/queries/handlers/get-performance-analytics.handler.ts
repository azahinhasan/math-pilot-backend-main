import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPerformanceAnalyticsQuery } from '../get-performance-analytics.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  DifficultyLevel,
  SubmissionStatus,
  SubmissionType,
} from '@prisma/client';

interface GranularMetrics {
  counts: {
    attempted: number;
    correct: number;
  };
  marks: {
    attempted: number;
    correct: number;
  };
  time: {
    attempted: number;
    correct: number;
  };
}

interface OverallPerformance extends GranularMetrics {
  accuracyRate: number;
  marksPercentage: number;
  averageTimePerQuestion: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  lastActivity: Date | null;

  weightedAccuracy: number;
  weightedMarksPercentage: number;
}

interface DifficultyPerformance extends GranularMetrics {
  difficulty: DifficultyLevel;
  accuracyRate: number;
  marksPercentage: number;
  averageTimePerQuestion: number;
  weight: number; // 0.2, 0.3, or 0.5
}

interface TopicPerformance extends GranularMetrics {
  topicId: string;
  topicName: string;
  moduleName: string;
  accuracyRate: number;
  marksPercentage: number;
  averageTimePerQuestion: number;
  lastAccessedAt: Date | null;
  isFavorite: boolean;
  status: string | null;
}

interface SubmissionTypePerformance extends GranularMetrics {
  type: SubmissionType;
  accuracyRate: number;
  marksPercentage: number;
  averageTimePerQuestion: number;
}

interface ModulePerformance extends GranularMetrics {
  moduleId: string;
  moduleName: string;
  accuracyRate: number;
  marksPercentage: number;
  averageTimePerQuestion: number;
  topicCount: number;
}

interface RecentActivity {
  submissionId: string;
  questionName: string;
  topicName: string | null;
  submissionType: SubmissionType;
  status: SubmissionStatus;
  marksObtained: number | null;
  totalMarks: number | null;
  beganAt: Date;
  endedAt: Date | null;
}

interface PerformanceAnalytics {
  overall: OverallPerformance;
  byDifficulty: DifficultyPerformance[];
  byTopic: TopicPerformance[];
  byModule: ModulePerformance[];
  bySubmissionType: SubmissionTypePerformance[];
  recentActivity: RecentActivity[];
  weakestTopics: TopicPerformance[];
  strongestTopics: TopicPerformance[];
}

@QueryHandler(GetPerformanceAnalyticsQuery)
export class GetPerformanceAnalyticsHandler
  implements IQueryHandler<GetPerformanceAnalyticsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetPerformanceAnalyticsQuery,
  ): Promise<PerformanceAnalytics> {
    const {
      studentId,
      startDate,
      endDate,
      submissionType,
      difficulty,
      topicId,
      moduleId,
    } = query;

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        auth: {
          select: {
            email: true,
            username: true,
          },
        },
      },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const submissionFilter: any = {
      studentId,
      voided: false,
    };

    if (Object.keys(dateFilter).length > 0) {
      submissionFilter.beganAt = dateFilter;
    }

    if (submissionType) {
      submissionFilter.type = submissionType;
    }

    if (topicId || moduleId || difficulty) {
      submissionFilter.question = {};
      if (topicId) {
        submissionFilter.question.topicId = topicId;
      }
      if (moduleId) {
        submissionFilter.question.moduleId = moduleId;
      }
      if (difficulty) {
        submissionFilter.question.difficulty_level = difficulty;
      }
    }

    const submissions = await this.prisma.submission.findMany({
      where: submissionFilter,
      include: {
        question: {
          include: {
            topic: {
              include: {
                module: true,
              },
            },
          },
        },
      },
      orderBy: {
        beganAt: 'desc',
      },
    });

    const topicProgressFilter: any = {
      studentId,
    };

    if (topicId) {
      topicProgressFilter.topicId = topicId;
    }

    const topicProgress = await this.prisma.studentTopicProgress.findMany({
      where: topicProgressFilter,
      include: {
        topic: {
          include: {
            module: true,
          },
        },
      },
    });

    const overall = this.calculateOverallPerformance(student, submissions);

    const byDifficulty = this.calculateDifficultyPerformance(submissions);

    const byTopic = this.calculateTopicPerformance(topicProgress, submissions);

    const byModule = this.calculateModulePerformance(submissions);

    const bySubmissionType =
      this.calculateSubmissionTypePerformance(submissions);

    const recentActivity = this.getRecentActivity(submissions);

    const sortedTopics = [...byTopic].sort(
      (a, b) => a.accuracyRate - b.accuracyRate,
    );
    const weakestTopics = sortedTopics
      .filter((t) => t.counts.attempted >= 3)
      .slice(0, 5);
    const strongestTopics = sortedTopics
      .filter((t) => t.counts.attempted >= 3)
      .reverse()
      .slice(0, 5);

    return {
      overall,
      byDifficulty,
      byTopic,
      byModule,
      bySubmissionType,
      recentActivity,
      weakestTopics,
      strongestTopics,
    };
  }

  private calculateOverallPerformance(
    student: any,
    submissions: any[],
  ): OverallPerformance {
    const completedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.Graded,
    );

    const countsAttempted = submissions.length;
    const countsCorrect = completedSubmissions.reduce(
      (sum, s) => sum + (s.correctAnswersCount || 0),
      0,
    );

    const marksAttempted = completedSubmissions.reduce(
      (sum, s) => sum + (s.question?.totalMarks || 0),
      0,
    );
    const marksCorrect = completedSubmissions.reduce(
      (sum, s) => sum + (s.awardedMarks || 0),
      0,
    );

    let timeAttempted = 0;
    let timeCorrect = 0;

    submissions.forEach((s) => {
      if (s.beganAt && s.endedAt) {
        const timeDiff =
          (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) /
          1000;
        timeAttempted += timeDiff;

        if (s.correctAnswersCount && s.correctAnswersCount > 0) {
          timeCorrect += timeDiff;
        }
      }
    });

    const accuracyRate =
      countsAttempted > 0 ? (countsCorrect / countsAttempted) * 100 : 0;

    const marksPercentage =
      marksAttempted > 0 ? (marksCorrect / marksAttempted) * 100 : 0;

    const averageTimePerQuestion =
      countsAttempted > 0 ? timeAttempted / countsAttempted : 0;

    const difficultyWeights = {
      Easy: 0.2,
      Medium: 0.3,
      Hard: 0.5,
    };

    const difficultyMetrics = new Map<
      DifficultyLevel,
      {
        attempted: number;
        correct: number;
        marksAttempted: number;
        marksCorrect: number;
      }
    >();

    Object.values(DifficultyLevel).forEach((level) => {
      difficultyMetrics.set(level, {
        attempted: 0,
        correct: 0,
        marksAttempted: 0,
        marksCorrect: 0,
      });
    });

    completedSubmissions.forEach((s) => {
      const difficulty = s.question?.difficulty_level;
      if (difficulty) {
        const stats = difficultyMetrics.get(difficulty);
        if (stats) {
          stats.attempted += 1;
          stats.correct += s.correctAnswersCount || 0;
          stats.marksAttempted += s.question?.totalMarks || 0;
          stats.marksCorrect += s.awardedMarks || 0;
        }
      }
    });

    let weightedAccuracy = 0;
    let weightedMarksPercentage = 0;
    let totalWeight = 0;

    difficultyMetrics.forEach((stats, difficulty) => {
      const weight = difficultyWeights[difficulty];
      if (stats.attempted > 0) {
        const accuracy = (stats.correct / stats.attempted) * 100;
        const marksPerc =
          stats.marksAttempted > 0
            ? (stats.marksCorrect / stats.marksAttempted) * 100
            : 0;

        weightedAccuracy += accuracy * weight;
        weightedMarksPercentage += marksPerc * weight;
        totalWeight += weight;
      }
    });

    if (totalWeight > 0 && totalWeight < 1) {
      weightedAccuracy = weightedAccuracy / totalWeight;
      weightedMarksPercentage = weightedMarksPercentage / totalWeight;
    }

    return {
      counts: {
        attempted: countsAttempted,
        correct: countsCorrect,
      },
      marks: {
        attempted: marksAttempted,
        correct: marksCorrect,
      },
      time: {
        attempted: Math.round(timeAttempted),
        correct: Math.round(timeCorrect),
      },
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
      marksPercentage: parseFloat(marksPercentage.toFixed(2)),
      averageTimePerQuestion: parseFloat(averageTimePerQuestion.toFixed(2)),
      currentStreak: student.currentStreak,
      longestStreak: student.longestStreak,
      totalXp: student.totalXp,
      lastActivity: student.lastActivity,
      weightedAccuracy: parseFloat(weightedAccuracy.toFixed(2)),
      weightedMarksPercentage: parseFloat(weightedMarksPercentage.toFixed(2)),
    };
  }

  private calculateDifficultyPerformance(
    submissions: any[],
  ): DifficultyPerformance[] {
    const difficultyWeights = {
      Easy: 0.2,
      Medium: 0.3,
      Hard: 0.5,
    };

    const difficultyMap = new Map<
      DifficultyLevel,
      {
        countsAttempted: number;
        countsCorrect: number;
        marksAttempted: number;
        marksCorrect: number;
        timeAttempted: number;
        timeCorrect: number;
      }
    >();

    Object.values(DifficultyLevel).forEach((level) => {
      difficultyMap.set(level, {
        countsAttempted: 0,
        countsCorrect: 0,
        marksAttempted: 0,
        marksCorrect: 0,
        timeAttempted: 0,
        timeCorrect: 0,
      });
    });

    submissions.forEach((submission) => {
      const difficulty = submission.question?.difficulty_level;
      if (!difficulty) return;

      const stats = difficultyMap.get(difficulty);
      if (stats) {
        stats.countsAttempted += 1;
        stats.countsCorrect += submission.correctAnswersCount || 0;

        if (submission.status === SubmissionStatus.Graded) {
          stats.marksAttempted += submission.question?.totalMarks || 0;
          stats.marksCorrect += submission.awardedMarks || 0;
        }

        if (submission.beganAt && submission.endedAt) {
          const timeDiff =
            (new Date(submission.endedAt).getTime() -
              new Date(submission.beganAt).getTime()) /
            1000;
          stats.timeAttempted += timeDiff;

          if (
            submission.correctAnswersCount &&
            submission.correctAnswersCount > 0
          ) {
            stats.timeCorrect += timeDiff;
          }
        }
      }
    });

    return Array.from(difficultyMap.entries()).map(([difficulty, stats]) => {
      const accuracyRate =
        stats.countsAttempted > 0
          ? (stats.countsCorrect / stats.countsAttempted) * 100
          : 0;

      const marksPercentage =
        stats.marksAttempted > 0
          ? (stats.marksCorrect / stats.marksAttempted) * 100
          : 0;

      const averageTimePerQuestion =
        stats.countsAttempted > 0
          ? stats.timeAttempted / stats.countsAttempted
          : 0;

      return {
        difficulty,
        counts: {
          attempted: stats.countsAttempted,
          correct: stats.countsCorrect,
        },
        marks: {
          attempted: stats.marksAttempted,
          correct: stats.marksCorrect,
        },
        time: {
          attempted: Math.round(stats.timeAttempted),
          correct: Math.round(stats.timeCorrect),
        },
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        marksPercentage: parseFloat(marksPercentage.toFixed(2)),
        averageTimePerQuestion: parseFloat(averageTimePerQuestion.toFixed(2)),
        weight: difficultyWeights[difficulty],
      };
    });
  }

  private calculateTopicPerformance(
    topicProgress: any[],
    submissions: any[],
  ): TopicPerformance[] {
    const topicMetricsMap = new Map<
      string,
      {
        marksAttempted: number;
        marksCorrect: number;
        timeAttempted: number;
        timeCorrect: number;
      }
    >();

    submissions.forEach((submission) => {
      const topicId = submission.question?.topicId;
      if (!topicId) return;

      if (!topicMetricsMap.has(topicId)) {
        topicMetricsMap.set(topicId, {
          marksAttempted: 0,
          marksCorrect: 0,
          timeAttempted: 0,
          timeCorrect: 0,
        });
      }

      const metrics = topicMetricsMap.get(topicId)!;

      if (submission.status === SubmissionStatus.Graded) {
        metrics.marksAttempted += submission.question?.totalMarks || 0;
        metrics.marksCorrect += submission.awardedMarks || 0;
      }

      if (submission.beganAt && submission.endedAt) {
        const timeDiff =
          (new Date(submission.endedAt).getTime() -
            new Date(submission.beganAt).getTime()) /
          1000;
        metrics.timeAttempted += timeDiff;

        if (
          submission.correctAnswersCount &&
          submission.correctAnswersCount > 0
        ) {
          metrics.timeCorrect += timeDiff;
        }
      }
    });

    return topicProgress.map((progress) => {
      const accuracyRate =
        progress.questionsAttempted > 0
          ? (progress.questionsCorrect / progress.questionsAttempted) * 100
          : 0;

      const metrics = topicMetricsMap.get(progress.topicId) || {
        marksAttempted: 0,
        marksCorrect: 0,
        timeAttempted: 0,
        timeCorrect: 0,
      };

      const marksPercentage =
        metrics.marksAttempted > 0
          ? (metrics.marksCorrect / metrics.marksAttempted) * 100
          : 0;

      const averageTimePerQuestion =
        progress.questionsAttempted > 0
          ? metrics.timeAttempted / progress.questionsAttempted
          : 0;

      return {
        topicId: progress.topicId,
        topicName: progress.topic?.name || 'Unknown',
        moduleName: progress.topic?.module?.name || 'Unknown',
        counts: {
          attempted: progress.questionsAttempted || 0,
          correct: progress.questionsCorrect || 0,
        },
        marks: {
          attempted: metrics.marksAttempted,
          correct: metrics.marksCorrect,
        },
        time: {
          attempted: Math.round(metrics.timeAttempted),
          correct: Math.round(metrics.timeCorrect),
        },
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        marksPercentage: parseFloat(marksPercentage.toFixed(2)),
        averageTimePerQuestion: parseFloat(averageTimePerQuestion.toFixed(2)),
        lastAccessedAt: progress.lastAccessedAt,
        isFavorite: progress.isFavorite,
        status: progress.status,
      };
    });
  }

  private calculateModulePerformance(submissions: any[]): ModulePerformance[] {
    const moduleMap = new Map<
      string,
      {
        moduleName: string;
        countsAttempted: number;
        countsCorrect: number;
        marksAttempted: number;
        marksCorrect: number;
        timeAttempted: number;
        timeCorrect: number;
        topicIds: Set<string>;
      }
    >();

    submissions.forEach((submission) => {
      const moduleId = submission.question?.moduleId;
      const moduleName = submission.question?.topic?.module?.name;
      const topicId = submission.question?.topicId;

      if (!moduleId || !moduleName) return;

      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, {
          moduleName,
          countsAttempted: 0,
          countsCorrect: 0,
          marksAttempted: 0,
          marksCorrect: 0,
          timeAttempted: 0,
          timeCorrect: 0,
          topicIds: new Set(),
        });
      }

      const stats = moduleMap.get(moduleId)!;

      if (topicId) {
        stats.topicIds.add(topicId);
      }

      stats.countsAttempted += 1;
      stats.countsCorrect += submission.correctAnswersCount || 0;

      if (submission.status === SubmissionStatus.Graded) {
        stats.marksAttempted += submission.question?.totalMarks || 0;
        stats.marksCorrect += submission.awardedMarks || 0;
      }

      if (submission.beganAt && submission.endedAt) {
        const timeDiff =
          (new Date(submission.endedAt).getTime() -
            new Date(submission.beganAt).getTime()) /
          1000;
        stats.timeAttempted += timeDiff;

        if (
          submission.correctAnswersCount &&
          submission.correctAnswersCount > 0
        ) {
          stats.timeCorrect += timeDiff;
        }
      }
    });

    return Array.from(moduleMap.entries()).map(([moduleId, stats]) => {
      const accuracyRate =
        stats.countsAttempted > 0
          ? (stats.countsCorrect / stats.countsAttempted) * 100
          : 0;

      const marksPercentage =
        stats.marksAttempted > 0
          ? (stats.marksCorrect / stats.marksAttempted) * 100
          : 0;

      const averageTimePerQuestion =
        stats.countsAttempted > 0
          ? stats.timeAttempted / stats.countsAttempted
          : 0;

      return {
        moduleId,
        moduleName: stats.moduleName,
        counts: {
          attempted: stats.countsAttempted,
          correct: stats.countsCorrect,
        },
        marks: {
          attempted: stats.marksAttempted,
          correct: stats.marksCorrect,
        },
        time: {
          attempted: Math.round(stats.timeAttempted),
          correct: Math.round(stats.timeCorrect),
        },
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        marksPercentage: parseFloat(marksPercentage.toFixed(2)),
        averageTimePerQuestion: parseFloat(averageTimePerQuestion.toFixed(2)),
        topicCount: stats.topicIds.size,
      };
    });
  }

  private calculateSubmissionTypePerformance(
    submissions: any[],
  ): SubmissionTypePerformance[] {
    const typeMap = new Map<
      SubmissionType,
      {
        countsAttempted: number;
        countsCorrect: number;
        marksAttempted: number;
        marksCorrect: number;
        timeAttempted: number;
        timeCorrect: number;
      }
    >();

    Object.values(SubmissionType).forEach((type) => {
      typeMap.set(type, {
        countsAttempted: 0,
        countsCorrect: 0,
        marksAttempted: 0,
        marksCorrect: 0,
        timeAttempted: 0,
        timeCorrect: 0,
      });
    });

    submissions.forEach((submission) => {
      const stats = typeMap.get(submission.type);
      if (stats) {
        stats.countsAttempted += 1;
        stats.countsCorrect += submission.correctAnswersCount || 0;

        if (submission.status === SubmissionStatus.Graded) {
          stats.marksAttempted += submission.question?.totalMarks || 0;
          stats.marksCorrect += submission.awardedMarks || 0;
        }

        if (submission.beganAt && submission.endedAt) {
          const timeDiff =
            (new Date(submission.endedAt).getTime() -
              new Date(submission.beganAt).getTime()) /
            1000;
          stats.timeAttempted += timeDiff;

          if (
            submission.correctAnswersCount &&
            submission.correctAnswersCount > 0
          ) {
            stats.timeCorrect += timeDiff;
          }
        }
      }
    });

    return Array.from(typeMap.entries()).map(([type, stats]) => {
      const accuracyRate =
        stats.countsAttempted > 0
          ? (stats.countsCorrect / stats.countsAttempted) * 100
          : 0;

      const marksPercentage =
        stats.marksAttempted > 0
          ? (stats.marksCorrect / stats.marksAttempted) * 100
          : 0;

      const averageTimePerQuestion =
        stats.countsAttempted > 0
          ? stats.timeAttempted / stats.countsAttempted
          : 0;

      return {
        type,
        counts: {
          attempted: stats.countsAttempted,
          correct: stats.countsCorrect,
        },
        marks: {
          attempted: stats.marksAttempted,
          correct: stats.marksCorrect,
        },
        time: {
          attempted: Math.round(stats.timeAttempted),
          correct: Math.round(stats.timeCorrect),
        },
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        marksPercentage: parseFloat(marksPercentage.toFixed(2)),
        averageTimePerQuestion: parseFloat(averageTimePerQuestion.toFixed(2)),
      };
    });
  }

  private getRecentActivity(submissions: any[]): RecentActivity[] {
    return submissions.slice(0, 10).map((submission) => ({
      submissionId: submission.id,
      questionName: submission.question?.name || 'Unknown',
      topicName: submission.question?.topic?.name || null,
      submissionType: submission.type,
      status: submission.status,
      marksObtained: submission.awardedMarks,
      totalMarks: submission.question?.totalMarks || null,
      beganAt: submission.beganAt,
      endedAt: submission.endedAt,
    }));
  }
}
