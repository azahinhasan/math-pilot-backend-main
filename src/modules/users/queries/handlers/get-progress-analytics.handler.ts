import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProgressAnalyticsQuery } from '../get-progress-analytics.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DifficultyLevel } from '@prisma/client';

interface WeeklyAccuracy {
  week: Date;
  accuracy: number;
  questionsAttempted: number;
  trendLine: number;
}

interface AccuracyProgression {
  overallTrend: {
    direction: 'Improving' | 'Declining' | 'Stable' | 'Fluctuating';
    trendPercentage: number;
    confidenceScore: number;
  };
  accuracyOverTime: WeeklyAccuracy[];
  difficultyProgression: Array<{
    difficulty: DifficultyLevel;
    initialAccuracy: number;
    currentAccuracy: number;
    improvement: number;
    improvementRate: number;
  }>;
  topicProgression: Array<{
    topicName: string;
    moduleName: string;
    firstAttemptAccuracy: number;
    currentAccuracy: number;
    improvement: number;
    attemptsCount: number;
    masteryLevel: 'Novice' | 'Developing' | 'Proficient' | 'Expert';
  }>;
}

interface PerformanceGrowthRate {
  weeklyGrowthRate: number;
  monthlyGrowthRate: number;
  growthAcceleration: {
    isAccelerating: boolean;
    accelerationRate: number;
  };
  performanceComparison: {
    lastWeekVsPrevious: number;
    lastMonthVsPrevious: number;
  };
  projections: {
    projectedAccuracyNextMonth: number;
    confidenceLevel: number;
  };
}

interface TopicMasteryProgress {
  topicId: string;
  topicName: string;
  moduleName: string;
  currentMasteryLevel: 'Novice' | 'Developing' | 'Proficient' | 'Expert';
  currentAccuracy: number;
  totalAttempts: number;
  initialMasteryLevel: 'Novice' | 'Developing' | 'Proficient' | 'Expert';
  levelsAdvanced: number;
  firstAttemptDate: Date;
  lastAttemptDate: Date;
  daysToCurrentLevel: number;
  progressToNextLevel: number;
  attemptsNeededForNextLevel: number;
  accuracyNeededForNextLevel: number;
}

interface TopicMasteryTracking {
  masteryDistribution: {
    expert: number;
    proficient: number;
    developing: number;
    novice: number;
  };
  masteryProgression: TopicMasteryProgress[];
  averageDaysToMastery: number;
  fastestMastery: {
    topicName: string;
    daysToMaster: number;
  } | null;
}

interface DifficultyAdvancement {
  currentDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  distributionOverTime: Array<{
    period: Date;
    easyPercentage: number;
    mediumPercentage: number;
    hardPercentage: number;
  }>;
  difficultyProgression: {
    isProgressing: boolean;
    progressionRate: number;
    firstHardQuestionDate: Date | null;
    hardQuestionsCount: number;
    hardQuestionsSuccessRate: number;
    readyForNextLevel: boolean;
    recommendedDifficulty: 'Easy' | 'Medium' | 'Hard';
  };
  challengeAdoption: {
    willingnessToChallenge: number;
    comfortZone: 'Easy' | 'Medium' | 'Hard';
    growthMindset: boolean;
  };
}

interface TopicCompletion {
  topicId: string;
  topicName: string;
  moduleName: string;
  questionsAttempted: number;
  minimumAttemptsRequired: number;
  accuracyAchieved: number;
  minimumAccuracyRequired: number;
  isCompleted: boolean;
  completionPercentage: number;
  firstAttemptDate: Date | null;
  lastAttemptDate: Date | null;
  completedDate: Date | null;
}

interface ModuleCompletion {
  moduleId: string;
  moduleName: string;
  totalTopics: number;
  topicsStarted: number;
  topicsCompleted: number;
  completionPercentage: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  startedDate: Date | null;
  completedDate: Date | null;
  daysInProgress: number | null;
  estimatedCompletionDate: Date | null;
  averageAccuracyInModule: number;
  totalQuestionsAttempted: number;
}

interface CurriculumCompletion {
  overallCompletion: {
    totalModules: number;
    modulesStarted: number;
    modulesInProgress: number;
    modulesCompleted: number;
    completionPercentage: number;
  };
  moduleCompletion: ModuleCompletion[];
  topicCompletion: TopicCompletion[];
  completionVelocity: {
    topicsCompletedPerWeek: number;
    averageDaysPerTopic: number;
    projectedFullCompletionDate: Date | null;
    projectedDaysRemaining: number | null;
  };
}

// Milestone interfaces removed - milestones are no longer part of the analytics

interface LearningSpeedMetrics {
  overallLearningSpeed: {
    averageDaysToTopicMastery: number;
    averageAttemptsToMastery: number;
    learningVelocity: 'Fast' | 'Average' | 'Slow';
  };
  speedByTopic: Array<{
    topicName: string;
    moduleName: string;
    daysFromFirstToMastery: number;
    totalAttempts: number;
    learningSpeed: 'Quick' | 'Normal' | 'Gradual' | 'Struggling';
  }>;
  learningCurve: {
    improvementRate: number;
    accelerationPhase: boolean;
    plateauDetected: boolean;
    plateauTopics: string[];
  };
}

interface Recommendation {
  type: 'Topic' | 'Difficulty' | 'Consistency' | 'Strategy';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  reasoning: string;
  actionItems: string[];
  expectedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    timeframe: string;
  };
}

interface ProgressRecommendations {
  recommendations: Recommendation[];
  strengths: Array<{
    area: string;
    description: string;
    suggestion: string;
  }>;
  areasForImprovement: Array<{
    area: string;
    currentStatus: string;
    targetStatus: string;
    gap: string;
    recommendation: string;
  }>;
  nextBestActions: Array<{
    action: string;
    reason: string;
    priority: number;
  }>;
}

interface ProgressAnalytics {
  learningTrajectory: {
    accuracyProgression: AccuracyProgression;
    growthRate: PerformanceGrowthRate;
  };
  skillMastery: {
    topicMastery: TopicMasteryTracking;
    difficultyAdvancement: DifficultyAdvancement;
  };
  curriculumProgress: CurriculumCompletion;
  learningSpeed: LearningSpeedMetrics;
  recommendations?: ProgressRecommendations;
}

// ==================== Handler ====================

@QueryHandler(GetProgressAnalyticsQuery)
export class GetProgressAnalyticsHandler
  implements IQueryHandler<GetProgressAnalyticsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProgressAnalyticsQuery): Promise<ProgressAnalytics> {
    const {
      studentId,
      startDate,
      endDate,
      topicId,
      moduleId,
      includeMilestones,
      includeRecommendations,
    } = query;

    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    // Build filters
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

    if (topicId || moduleId) {
      submissionFilter.question = {};
      if (topicId) submissionFilter.question.topicId = topicId;
      if (moduleId) submissionFilter.question.moduleId = moduleId;
    }

    // Fetch all necessary data
    const [submissions, topicProgress, allTopics, modules] = await Promise.all([
      this.prisma.submission.findMany({
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
          beganAt: 'asc', // Ascending for time series
        },
      }),
      this.prisma.studentTopicDetails.findMany({
        where: {
          studentId,
          ...(topicId && { topicId }),
        },
        include: {
          topic: {
            include: {
              module: true,
            },
          },
        },
      }),
      this.prisma.topic.findMany({
        where: {
          ...(moduleId && { moduleId }),
        },
        include: {
          module: true,
        },
      }),
      this.prisma.module.findMany(),
    ]);

    // Calculate core analytics
    const accuracyProgression = this.calculateAccuracyProgression(
      submissions,
      topicProgress,
    );
    const growthRate = this.calculatePerformanceGrowthRate(submissions);
    const topicMastery = this.calculateTopicMasteryTracking(
      topicProgress,
      submissions,
    );
    const difficultyAdvancement =
      this.calculateDifficultyAdvancement(submissions);
    const curriculumProgress = this.calculateCurriculumCompletion(
      topicProgress,
      allTopics,
      modules,
      submissions,
    );
    const learningSpeed = this.calculateLearningSpeedMetrics(
      topicProgress,
      submissions,
    );

    const result: ProgressAnalytics = {
      learningTrajectory: {
        accuracyProgression,
        growthRate,
      },
      skillMastery: {
        topicMastery,
        difficultyAdvancement,
      },
      curriculumProgress,
      learningSpeed,
    };

    // Optional recommendations
    if (includeRecommendations) {
      result.recommendations = this.generateRecommendations(
        accuracyProgression,
        difficultyAdvancement,
        curriculumProgress,
        learningSpeed,
        topicProgress,
      );
    }

    return result;
  }

  // ==================== Accuracy Progression ====================

  private calculateAccuracyProgression(
    submissions: any[],
    topicProgress: any[],
  ): AccuracyProgression {
    // Group submissions by week
    const weeklyData = this.groupSubmissionsByWeek(submissions);

    // Overall trend
    const firstWeekAccuracy = weeklyData[0]?.accuracy || 0;
    const latestWeekAccuracy = weeklyData[weeklyData.length - 1]?.accuracy || 0;
    const trendPercentage = latestWeekAccuracy - firstWeekAccuracy;

    let direction: 'Improving' | 'Declining' | 'Stable' | 'Fluctuating';
    if (trendPercentage > 5) direction = 'Improving';
    else if (trendPercentage < -5) direction = 'Declining';
    else if (this.isFluctuating(weeklyData)) direction = 'Fluctuating';
    else direction = 'Stable';

    const confidenceScore = Math.min(weeklyData.length / 12, 1); // More weeks = more confidence

    // Difficulty progression
    const difficultyProgression =
      this.calculateDifficultyProgressionForAccuracy(submissions);

    // Topic progression
    const topicProgression = topicProgress.map((progress) => {
      const topicSubmissions = submissions.filter(
        (s) => s.question?.topicId === progress.topicId,
      );

      const currentAccuracy =
        progress.questionsAttempted > 0
          ? (progress.questionsCorrect / progress.questionsAttempted) * 100
          : 0;

      // First 5 submissions accuracy
      const first5 = topicSubmissions.slice(0, 5);
      const firstAttemptAccuracy =
        first5.length > 0
          ? (first5.reduce((sum, s) => sum + (s.correctAnswersCount || 0), 0) /
              first5.length) *
            100
          : 0;

      const improvement = currentAccuracy - firstAttemptAccuracy;
      const masteryLevel = this.determineMasteryLevel(
        currentAccuracy,
        progress.questionsAttempted,
      );

      return {
        topicName: progress.topic?.name || 'Unknown',
        moduleName: progress.topic?.module?.name || 'Unknown',
        firstAttemptAccuracy: parseFloat(firstAttemptAccuracy.toFixed(2)),
        currentAccuracy: parseFloat(currentAccuracy.toFixed(2)),
        improvement: parseFloat(improvement.toFixed(2)),
        attemptsCount: progress.questionsAttempted,
        masteryLevel,
      };
    });

    return {
      overallTrend: {
        direction,
        trendPercentage: parseFloat(trendPercentage.toFixed(2)),
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
      },
      accuracyOverTime: weeklyData,
      difficultyProgression,
      topicProgression,
    };
  }

  private groupSubmissionsByWeek(submissions: any[]): WeeklyAccuracy[] {
    const weekMap = new Map<string, { correct: number; total: number }>();

    submissions.forEach((s) => {
      const date = new Date(s.beganAt);
      const weekStart = this.getWeekStart(date);
      const weekKey = weekStart.toISOString();

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { correct: 0, total: 0 });
      }

      const data = weekMap.get(weekKey)!;
      data.total++;
      data.correct += s.correctAnswersCount || 0;
    });

    const weeklyData = Array.from(weekMap.entries())
      .map(([weekKey, data]) => ({
        week: new Date(weekKey),
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        questionsAttempted: data.total,
        trendLine: 0, // Will be calculated next
      }))
      .sort((a, b) => a.week.getTime() - b.week.getTime());

    // Calculate moving average for trend line
    weeklyData.forEach((week, i) => {
      const windowSize = Math.min(4, i + 1);
      const startIdx = Math.max(0, i - windowSize + 1);
      const window = weeklyData.slice(startIdx, i + 1);
      const avgAccuracy =
        window.reduce((sum, w) => sum + w.accuracy, 0) / window.length;
      week.trendLine = parseFloat(avgAccuracy.toFixed(2));
    });

    return weeklyData.map((w) => ({
      ...w,
      accuracy: parseFloat(w.accuracy.toFixed(2)),
    }));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to previous Sunday
    return new Date(d.setDate(diff));
  }

  private isFluctuating(weeklyData: WeeklyAccuracy[]): boolean {
    if (weeklyData.length < 3) return false;

    let changes = 0;
    for (let i = 1; i < weeklyData.length; i++) {
      const diff = weeklyData[i].accuracy - weeklyData[i - 1].accuracy;
      if (Math.abs(diff) > 10) changes++;
    }

    return changes >= weeklyData.length / 2;
  }

  private calculateDifficultyProgressionForAccuracy(submissions: any[]) {
    const difficultyData = new Map<
      DifficultyLevel,
      { correct: number; total: number; submissions: any[] }
    >();

    Object.values(DifficultyLevel).forEach((level) => {
      difficultyData.set(level, { correct: 0, total: 0, submissions: [] });
    });

    submissions.forEach((s) => {
      const difficulty = s.question?.difficultyLevel;
      if (difficulty && difficultyData.has(difficulty)) {
        const data = difficultyData.get(difficulty)!;
        data.total++;
        data.correct += s.correctAnswersCount || 0;
        data.submissions.push(s);
      }
    });

    return Array.from(difficultyData.entries()).map(([difficulty, data]) => {
      const currentAccuracy =
        data.total > 0 ? (data.correct / data.total) * 100 : 0;

      // First 10 submissions
      const first10 = data.submissions.slice(0, 10);
      const initialAccuracy =
        first10.length > 0
          ? (first10.reduce((sum, s) => sum + (s.correctAnswersCount || 0), 0) /
              first10.length) *
            100
          : 0;

      const improvement = currentAccuracy - initialAccuracy;
      const improvementRate =
        initialAccuracy > 0 ? (improvement / initialAccuracy) * 100 : 0;

      return {
        difficulty,
        initialAccuracy: parseFloat(initialAccuracy.toFixed(2)),
        currentAccuracy: parseFloat(currentAccuracy.toFixed(2)),
        improvement: parseFloat(improvement.toFixed(2)),
        improvementRate: parseFloat(improvementRate.toFixed(2)),
      };
    });
  }

  // ==================== Performance Growth Rate ====================

  private calculatePerformanceGrowthRate(
    submissions: any[],
  ): PerformanceGrowthRate {
    const weeklyData = this.groupSubmissionsByWeek(submissions);

    if (weeklyData.length < 2) {
      return {
        weeklyGrowthRate: 0,
        monthlyGrowthRate: 0,
        growthAcceleration: {
          isAccelerating: false,
          accelerationRate: 0,
        },
        performanceComparison: {
          lastWeekVsPrevious: 0,
          lastMonthVsPrevious: 0,
        },
        projections: {
          projectedAccuracyNextMonth: 0,
          confidenceLevel: 0,
        },
      };
    }

    // Calculate weekly growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < weeklyData.length; i++) {
      const rate =
        weeklyData[i - 1].accuracy > 0
          ? ((weeklyData[i].accuracy - weeklyData[i - 1].accuracy) /
              weeklyData[i - 1].accuracy) *
            100
          : 0;
      growthRates.push(rate);
    }

    const weeklyGrowthRate =
      growthRates.length > 0
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 0;

    const monthlyGrowthRate = weeklyGrowthRate * 4.3; // Approximate weeks per month

    // Growth acceleration
    const firstHalfRates = growthRates.slice(
      0,
      Math.floor(growthRates.length / 2),
    );
    const secondHalfRates = growthRates.slice(
      Math.floor(growthRates.length / 2),
    );

    const firstHalfAvg =
      firstHalfRates.length > 0
        ? firstHalfRates.reduce((a, b) => a + b, 0) / firstHalfRates.length
        : 0;
    const secondHalfAvg =
      secondHalfRates.length > 0
        ? secondHalfRates.reduce((a, b) => a + b, 0) / secondHalfRates.length
        : 0;

    const isAccelerating = secondHalfAvg > firstHalfAvg;
    const accelerationRate = secondHalfAvg - firstHalfAvg;

    // Performance comparison
    const lastWeek = weeklyData[weeklyData.length - 1]?.accuracy || 0;
    const previousWeek = weeklyData[weeklyData.length - 2]?.accuracy || 0;
    const lastWeekVsPrevious =
      previousWeek > 0 ? ((lastWeek - previousWeek) / previousWeek) * 100 : 0;

    const lastMonth = weeklyData.slice(-4);
    const previousMonth = weeklyData.slice(-8, -4);
    const lastMonthAvg =
      lastMonth.length > 0
        ? lastMonth.reduce((sum, w) => sum + w.accuracy, 0) / lastMonth.length
        : 0;
    const previousMonthAvg =
      previousMonth.length > 0
        ? previousMonth.reduce((sum, w) => sum + w.accuracy, 0) /
          previousMonth.length
        : 0;
    const lastMonthVsPrevious =
      previousMonthAvg > 0
        ? ((lastMonthAvg - previousMonthAvg) / previousMonthAvg) * 100
        : 0;

    // Simple linear projection
    const currentAccuracy = weeklyData[weeklyData.length - 1]?.accuracy || 0;
    const projectedAccuracyNextMonth = Math.min(
      100,
      currentAccuracy + monthlyGrowthRate,
    );
    const confidenceLevel = Math.min(weeklyData.length / 12, 1);

    return {
      weeklyGrowthRate: parseFloat(weeklyGrowthRate.toFixed(2)),
      monthlyGrowthRate: parseFloat(monthlyGrowthRate.toFixed(2)),
      growthAcceleration: {
        isAccelerating,
        accelerationRate: parseFloat(accelerationRate.toFixed(2)),
      },
      performanceComparison: {
        lastWeekVsPrevious: parseFloat(lastWeekVsPrevious.toFixed(2)),
        lastMonthVsPrevious: parseFloat(lastMonthVsPrevious.toFixed(2)),
      },
      projections: {
        projectedAccuracyNextMonth: parseFloat(
          projectedAccuracyNextMonth.toFixed(2),
        ),
        confidenceLevel: parseFloat(confidenceLevel.toFixed(2)),
      },
    };
  }

  // ==================== Topic Mastery Tracking ====================

  private calculateTopicMasteryTracking(
    topicProgress: any[],
    submissions: any[],
  ): TopicMasteryTracking {
    const MASTERY_REQUIREMENTS = {
      Expert: { accuracy: 90, attempts: 10 },
      Proficient: { accuracy: 75, attempts: 10 },
      Developing: { accuracy: 60, attempts: 5 },
    };

    const masteryDistribution = {
      expert: 0,
      proficient: 0,
      developing: 0,
      novice: 0,
    };

    const masteryProgression: TopicMasteryProgress[] = topicProgress.map(
      (progress) => {
        const topicSubmissions = submissions
          .filter((s) => s.question?.topicId === progress.topicId)
          .sort(
            (a, b) =>
              new Date(a.beganAt).getTime() - new Date(b.beganAt).getTime(),
          );

        const currentAccuracy =
          progress.questionsAttempted > 0
            ? (progress.questionsCorrect / progress.questionsAttempted) * 100
            : 0;

        const currentLevel = this.determineMasteryLevel(
          currentAccuracy,
          progress.questionsAttempted,
        );

        // Initial level (first 5 submissions)
        const first5 = topicSubmissions.slice(0, 5);
        const initialAccuracy =
          first5.length > 0
            ? (first5.reduce(
                (sum, s) => sum + (s.correctAnswersCount || 0),
                0,
              ) /
                first5.length) *
              100
            : 0;
        const initialLevel = this.determineMasteryLevel(
          initialAccuracy,
          first5.length,
        );

        // Update distribution
        const levelKey =
          currentLevel.toLowerCase() as keyof typeof masteryDistribution;
        masteryDistribution[levelKey]++;

        // Calculate levels advanced
        const levels = ['Novice', 'Developing', 'Proficient', 'Expert'];
        const levelsAdvanced =
          levels.indexOf(currentLevel) - levels.indexOf(initialLevel);

        // Progress to next level
        const nextLevelIndex = levels.indexOf(currentLevel) + 1;
        const nextLevel =
          nextLevelIndex < levels.length ? levels[nextLevelIndex] : null;

        let progressToNextLevel = 100;
        let attemptsNeeded = 0;
        let accuracyNeeded = 0;

        if (nextLevel && nextLevel in MASTERY_REQUIREMENTS) {
          const requirements =
            MASTERY_REQUIREMENTS[
              nextLevel as keyof typeof MASTERY_REQUIREMENTS
            ];
          const accuracyProgress = Math.min(
            (currentAccuracy / requirements.accuracy) * 100,
            100,
          );
          const attemptsProgress = Math.min(
            (progress.questionsAttempted / requirements.attempts) * 100,
            100,
          );
          progressToNextLevel = (accuracyProgress + attemptsProgress) / 2;
          attemptsNeeded = Math.max(
            0,
            requirements.attempts - progress.questionsAttempted,
          );
          accuracyNeeded = Math.max(0, requirements.accuracy - currentAccuracy);
        }

        const firstDate = topicSubmissions[0]?.beganAt
          ? new Date(topicSubmissions[0].beganAt)
          : new Date();
        const lastDate = topicSubmissions[topicSubmissions.length - 1]?.beganAt
          ? new Date(topicSubmissions[topicSubmissions.length - 1].beganAt)
          : new Date();
        const daysToCurrentLevel =
          (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

        return {
          topicId: progress.topicId,
          topicName: progress.topic?.name || 'Unknown',
          moduleName: progress.topic?.module?.name || 'Unknown',
          currentMasteryLevel: currentLevel,
          currentAccuracy: parseFloat(currentAccuracy.toFixed(2)),
          totalAttempts: progress.questionsAttempted,
          initialMasteryLevel: initialLevel,
          levelsAdvanced,
          firstAttemptDate: firstDate,
          lastAttemptDate: lastDate,
          daysToCurrentLevel: parseFloat(daysToCurrentLevel.toFixed(2)),
          progressToNextLevel: parseFloat(progressToNextLevel.toFixed(2)),
          attemptsNeededForNextLevel: attemptsNeeded,
          accuracyNeededForNextLevel: parseFloat(accuracyNeeded.toFixed(2)),
        };
      },
    );

    // Calculate averages
    const masteredTopics = masteryProgression.filter(
      (m) =>
        m.currentMasteryLevel === 'Proficient' ||
        m.currentMasteryLevel === 'Expert',
    );
    const averageDaysToMastery =
      masteredTopics.length > 0
        ? masteredTopics.reduce((sum, m) => sum + m.daysToCurrentLevel, 0) /
          masteredTopics.length
        : 0;

    const fastestMastery =
      masteredTopics.length > 0
        ? masteredTopics.reduce((fastest, current) =>
            current.daysToCurrentLevel < fastest.daysToCurrentLevel
              ? current
              : fastest,
          )
        : null;

    return {
      masteryDistribution,
      masteryProgression,
      averageDaysToMastery: parseFloat(averageDaysToMastery.toFixed(2)),
      fastestMastery: fastestMastery
        ? {
            topicName: fastestMastery.topicName,
            daysToMaster: parseFloat(
              fastestMastery.daysToCurrentLevel.toFixed(2),
            ),
          }
        : null,
    };
  }

  private determineMasteryLevel(
    accuracy: number,
    attempts: number,
  ): 'Novice' | 'Developing' | 'Proficient' | 'Expert' {
    if (accuracy >= 90 && attempts >= 10) return 'Expert';
    if (accuracy >= 75 && attempts >= 10) return 'Proficient';
    if (accuracy >= 60 && attempts >= 5) return 'Developing';
    return 'Novice';
  }

  // ==================== Difficulty Advancement ====================

  private calculateDifficultyAdvancement(
    submissions: any[],
  ): DifficultyAdvancement {
    // Current distribution
    const total = submissions.length;
    const easyCount = submissions.filter(
      (s) => s.question?.difficultyLevel === 'Easy',
    ).length;
    const mediumCount = submissions.filter(
      (s) => s.question?.difficultyLevel === 'Medium',
    ).length;
    const hardCount = submissions.filter(
      (s) => s.question?.difficultyLevel === 'Hard',
    ).length;

    const currentDistribution = {
      easy: total > 0 ? parseFloat(((easyCount / total) * 100).toFixed(2)) : 0,
      medium:
        total > 0 ? parseFloat(((mediumCount / total) * 100).toFixed(2)) : 0,
      hard: total > 0 ? parseFloat(((hardCount / total) * 100).toFixed(2)) : 0,
    };

    // Distribution over time (monthly)
    const monthlyDistributions = this.groupSubmissionsByMonth(submissions);

    // Progression metrics
    const hardSubmissions = submissions.filter(
      (s) => s.question?.difficultyLevel === 'Hard',
    );
    const firstHardDate =
      hardSubmissions.length > 0 ? new Date(hardSubmissions[0].beganAt) : null;
    const hardSuccessRate =
      hardSubmissions.length > 0
        ? (hardSubmissions.reduce(
            (sum, s) => sum + (s.correctAnswersCount || 0),
            0,
          ) /
            hardSubmissions.length) *
          100
        : 0;

    const firstMonthHard = monthlyDistributions[0]?.hardPercentage || 0;
    const latestMonthHard =
      monthlyDistributions[monthlyDistributions.length - 1]?.hardPercentage ||
      0;
    const progressionRate = latestMonthHard - firstMonthHard;

    const mediumSubmissions = submissions.filter(
      (s) => s.question?.difficultyLevel === 'Medium',
    );
    const mediumAccuracy =
      mediumSubmissions.length > 0
        ? (mediumSubmissions.reduce(
            (sum, s) => sum + (s.correctAnswersCount || 0),
            0,
          ) /
            mediumSubmissions.length) *
          100
        : 0;

    const easyAccuracy =
      easyCount > 0
        ? (submissions
            .filter((s) => s.question?.difficultyLevel === 'Easy')
            .reduce((sum, s) => sum + (s.correctAnswersCount || 0), 0) /
            easyCount) *
          100
        : 0;

    let recommendedDifficulty: 'Easy' | 'Medium' | 'Hard';
    if (mediumAccuracy > 80) recommendedDifficulty = 'Hard';
    else if (easyAccuracy > 80) recommendedDifficulty = 'Medium';
    else recommendedDifficulty = 'Easy';

    // Challenge adoption
    const comfortZone =
      easyCount >= mediumCount && easyCount >= hardCount
        ? 'Easy'
        : mediumCount >= hardCount
          ? 'Medium'
          : 'Hard';

    const growthMindset =
      monthlyDistributions.length >= 2 &&
      monthlyDistributions[monthlyDistributions.length - 1].hardPercentage >
        monthlyDistributions[monthlyDistributions.length - 2].hardPercentage;

    return {
      currentDistribution,
      distributionOverTime: monthlyDistributions,
      difficultyProgression: {
        isProgressing: progressionRate > 5,
        progressionRate: parseFloat(progressionRate.toFixed(2)),
        firstHardQuestionDate: firstHardDate,
        hardQuestionsCount: hardCount,
        hardQuestionsSuccessRate: parseFloat(hardSuccessRate.toFixed(2)),
        readyForNextLevel: mediumAccuracy > 80,
        recommendedDifficulty,
      },
      challengeAdoption: {
        willingnessToChallenge: currentDistribution.hard,
        comfortZone,
        growthMindset,
      },
    };
  }

  private groupSubmissionsByMonth(submissions: any[]) {
    const monthMap = new Map<
      string,
      { easy: number; medium: number; hard: number; total: number }
    >();

    submissions.forEach((s) => {
      const date = new Date(s.beganAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { easy: 0, medium: 0, hard: 0, total: 0 });
      }

      const data = monthMap.get(monthKey)!;
      data.total++;

      const difficulty = s.question?.difficultyLevel?.toLowerCase();
      if (difficulty === 'easy') data.easy++;
      else if (difficulty === 'medium') data.medium++;
      else if (difficulty === 'hard') data.hard++;
    });

    return Array.from(monthMap.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-').map(Number);
        return {
          period: new Date(year, month - 1, 1),
          easyPercentage:
            data.total > 0
              ? parseFloat(((data.easy / data.total) * 100).toFixed(2))
              : 0,
          mediumPercentage:
            data.total > 0
              ? parseFloat(((data.medium / data.total) * 100).toFixed(2))
              : 0,
          hardPercentage:
            data.total > 0
              ? parseFloat(((data.hard / data.total) * 100).toFixed(2))
              : 0,
        };
      })
      .sort((a, b) => a.period.getTime() - b.period.getTime());
  }

  // ==================== Curriculum Completion ====================

  private calculateCurriculumCompletion(
    topicProgress: any[],
    allTopics: any[],
    modules: any[],
    submissions: any[],
  ): CurriculumCompletion {
    const COMPLETION_CRITERIA = {
      minimumAttempts: 10,
      minimumAccuracy: 75,
    };

    // Topic completion
    const topicCompletion: TopicCompletion[] = allTopics.map((topic) => {
      const progress = topicProgress.find((tp) => tp.topicId === topic.id);
      const topicSubmissions = submissions
        .filter((s) => s.question?.topicId === topic.id)
        .sort(
          (a, b) =>
            new Date(a.beganAt).getTime() - new Date(b.beganAt).getTime(),
        );

      if (!progress) {
        return {
          topicId: topic.id,
          topicName: topic.name,
          moduleName: topic.module?.name || 'Unknown',
          questionsAttempted: 0,
          minimumAttemptsRequired: COMPLETION_CRITERIA.minimumAttempts,
          accuracyAchieved: 0,
          minimumAccuracyRequired: COMPLETION_CRITERIA.minimumAccuracy,
          isCompleted: false,
          completionPercentage: 0,
          firstAttemptDate: null,
          lastAttemptDate: null,
          completedDate: null,
        };
      }

      const accuracy =
        progress.questionsAttempted > 0
          ? (progress.questionsCorrect / progress.questionsAttempted) * 100
          : 0;

      const attemptProgress = Math.min(
        (progress.questionsAttempted / COMPLETION_CRITERIA.minimumAttempts) *
          100,
        100,
      );
      const accuracyProgress = Math.min(
        (accuracy / COMPLETION_CRITERIA.minimumAccuracy) * 100,
        100,
      );
      const completionPercentage = (attemptProgress + accuracyProgress) / 2;

      const isCompleted =
        progress.questionsAttempted >= COMPLETION_CRITERIA.minimumAttempts &&
        accuracy >= COMPLETION_CRITERIA.minimumAccuracy;

      return {
        topicId: topic.id,
        topicName: topic.name,
        moduleName: topic.module?.name || 'Unknown',
        questionsAttempted: progress.questionsAttempted,
        minimumAttemptsRequired: COMPLETION_CRITERIA.minimumAttempts,
        accuracyAchieved: parseFloat(accuracy.toFixed(2)),
        minimumAccuracyRequired: COMPLETION_CRITERIA.minimumAccuracy,
        isCompleted,
        completionPercentage: parseFloat(completionPercentage.toFixed(2)),
        firstAttemptDate: topicSubmissions[0]
          ? new Date(topicSubmissions[0].beganAt)
          : null,
        lastAttemptDate: topicSubmissions[topicSubmissions.length - 1]
          ? new Date(topicSubmissions[topicSubmissions.length - 1].beganAt)
          : null,
        completedDate: isCompleted
          ? topicSubmissions[topicSubmissions.length - 1]
            ? new Date(topicSubmissions[topicSubmissions.length - 1].beganAt)
            : null
          : null,
      };
    });

    // Module completion
    const moduleCompletion: ModuleCompletion[] = modules.map((module) => {
      const moduleTopics = allTopics.filter((t) => t.moduleId === module.id);
      const completedTopics = topicCompletion.filter(
        (tc) =>
          moduleTopics.some((mt) => mt.id === tc.topicId) && tc.isCompleted,
      );
      const startedTopics = topicCompletion.filter(
        (tc) =>
          moduleTopics.some((mt) => mt.id === tc.topicId) &&
          tc.questionsAttempted > 0,
      );

      const completionPercentage =
        moduleTopics.length > 0
          ? (completedTopics.length / moduleTopics.length) * 100
          : 0;

      let status: 'Not Started' | 'In Progress' | 'Completed';
      if (completionPercentage === 100) status = 'Completed';
      else if (startedTopics.length > 0)
        status = 'In Progress'; // Fixed: Check if any topics started
      else status = 'Not Started';

      const moduleSubmissions = submissions.filter(
        (s) => s.question?.moduleId === module.id,
      );

      const averageAccuracy =
        moduleSubmissions.length > 0
          ? (moduleSubmissions.reduce(
              (sum, s) => sum + (s.correctAnswersCount || 0),
              0,
            ) /
              moduleSubmissions.length) *
            100
          : 0;

      const firstDate =
        startedTopics.length > 0 && startedTopics[0].firstAttemptDate
          ? startedTopics[0].firstAttemptDate
          : null;
      const lastDate =
        startedTopics.length > 0 &&
        startedTopics[startedTopics.length - 1].lastAttemptDate
          ? startedTopics[startedTopics.length - 1].lastAttemptDate
          : null;

      const daysInProgress =
        firstDate && lastDate
          ? (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
          : null;

      return {
        moduleId: module.id,
        moduleName: module.name,
        totalTopics: moduleTopics.length,
        topicsStarted: startedTopics.length,
        topicsCompleted: completedTopics.length,
        completionPercentage: parseFloat(completionPercentage.toFixed(2)),
        status,
        startedDate: firstDate,
        completedDate: status === 'Completed' ? lastDate : null,
        daysInProgress: daysInProgress
          ? parseFloat(daysInProgress.toFixed(2))
          : null,
        estimatedCompletionDate: null, // Would need velocity calculation
        averageAccuracyInModule: parseFloat(averageAccuracy.toFixed(2)),
        totalQuestionsAttempted: moduleSubmissions.length,
      };
    });

    // Overall completion
    const completedTopicsCount = topicCompletion.filter(
      (tc) => tc.isCompleted,
    ).length;
    const completedModulesCount = moduleCompletion.filter(
      (mc) => mc.status === 'Completed',
    ).length;

    // Completion velocity
    const completedTopicsWithDates = topicCompletion.filter(
      (tc) => tc.isCompleted && tc.completedDate,
    );

    let topicsCompletedPerWeek = 0;
    let averageDaysPerTopic = 0;

    if (completedTopicsWithDates.length > 1) {
      const dates = completedTopicsWithDates
        .map((tc) => tc.completedDate!.getTime())
        .sort((a, b) => a - b);
      const totalDays =
        (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
      topicsCompletedPerWeek =
        totalDays > 0 ? (completedTopicsWithDates.length / totalDays) * 7 : 0;
      averageDaysPerTopic = totalDays / completedTopicsWithDates.length;
    }

    const remainingTopics = allTopics.length - completedTopicsCount;
    const projectedDaysRemaining =
      topicsCompletedPerWeek > 0
        ? (remainingTopics / topicsCompletedPerWeek) * 7
        : null;
    const projectedFullCompletionDate = projectedDaysRemaining
      ? new Date(Date.now() + projectedDaysRemaining * 24 * 60 * 60 * 1000)
      : null;

    return {
      overallCompletion: {
        totalModules: modules.length,
        modulesStarted: moduleCompletion.filter(
          (mc) => mc.status !== 'Not Started',
        ).length,
        modulesInProgress: moduleCompletion.filter(
          (mc) => mc.status === 'In Progress',
        ).length,
        modulesCompleted: completedModulesCount,
        completionPercentage:
          allTopics.length > 0
            ? parseFloat(
                ((completedTopicsCount / allTopics.length) * 100).toFixed(2),
              )
            : 0,
      },
      moduleCompletion,
      topicCompletion,
      completionVelocity: {
        topicsCompletedPerWeek: parseFloat(topicsCompletedPerWeek.toFixed(2)),
        averageDaysPerTopic: parseFloat(averageDaysPerTopic.toFixed(2)),
        projectedFullCompletionDate,
        projectedDaysRemaining: projectedDaysRemaining
          ? parseFloat(projectedDaysRemaining.toFixed(2))
          : null,
      },
    };
  }

  // ==================== Learning Speed Metrics ====================

  private calculateLearningSpeedMetrics(
    topicProgress: any[],
    submissions: any[],
  ): LearningSpeedMetrics {
    const speedByTopic = topicProgress
      .map((progress) => {
        const topicSubmissions = submissions
          .filter((s) => s.question?.topicId === progress.topicId)
          .sort(
            (a, b) =>
              new Date(a.beganAt).getTime() - new Date(b.beganAt).getTime(),
          );

        if (topicSubmissions.length === 0) return null;

        const firstAttempt = new Date(topicSubmissions[0].beganAt);
        const lastAttempt = new Date(
          topicSubmissions[topicSubmissions.length - 1].beganAt,
        );
        const daysFromFirstToMastery =
          (lastAttempt.getTime() - firstAttempt.getTime()) /
          (1000 * 60 * 60 * 24);

        const accuracy =
          progress.questionsAttempted > 0
            ? (progress.questionsCorrect / progress.questionsAttempted) * 100
            : 0;

        let learningSpeed: 'Quick' | 'Normal' | 'Gradual' | 'Struggling';
        if (daysFromFirstToMastery <= 3 && progress.questionsAttempted <= 10) {
          learningSpeed = 'Quick';
        } else if (
          daysFromFirstToMastery <= 7 &&
          progress.questionsAttempted <= 15
        ) {
          learningSpeed = 'Normal';
        } else if (
          daysFromFirstToMastery <= 14 &&
          progress.questionsAttempted <= 25
        ) {
          learningSpeed = 'Gradual';
        } else {
          learningSpeed = 'Struggling';
        }

        return {
          topicName: progress.topic?.name || 'Unknown',
          moduleName: progress.topic?.module?.name || 'Unknown',
          daysFromFirstToMastery: parseFloat(daysFromFirstToMastery.toFixed(2)),
          totalAttempts: progress.questionsAttempted,
          learningSpeed,
        };
      })
      .filter((s) => s !== null) as Array<{
      topicName: string;
      moduleName: string;
      daysFromFirstToMastery: number;
      totalAttempts: number;
      learningSpeed: 'Quick' | 'Normal' | 'Gradual' | 'Struggling';
    }>;

    const averageDaysToMastery =
      speedByTopic.length > 0
        ? speedByTopic.reduce((sum, t) => sum + t.daysFromFirstToMastery, 0) /
          speedByTopic.length
        : 0;

    const averageAttemptsToMastery =
      speedByTopic.length > 0
        ? speedByTopic.reduce((sum, t) => sum + t.totalAttempts, 0) /
          speedByTopic.length
        : 0;

    let learningVelocity: 'Fast' | 'Average' | 'Slow';
    if (averageDaysToMastery <= 5) learningVelocity = 'Fast';
    else if (averageDaysToMastery <= 14) learningVelocity = 'Average';
    else learningVelocity = 'Slow';

    // Learning curve
    const weeklyData = this.groupSubmissionsByWeek(submissions);
    const improvementRate =
      weeklyData.length >= 2
        ? weeklyData[weeklyData.length - 1].accuracy - weeklyData[0].accuracy
        : 0;

    const recentWeeks = weeklyData.slice(-4);
    const accuracyVariation =
      recentWeeks.length > 0
        ? Math.sqrt(
            recentWeeks.reduce(
              (sum, w) =>
                sum +
                Math.pow(
                  w.accuracy -
                    recentWeeks.reduce((s, ww) => s + ww.accuracy, 0) /
                      recentWeeks.length,
                  2,
                ),
              0,
            ) / recentWeeks.length,
          )
        : 0;

    const plateauDetected = accuracyVariation < 3;

    const plateauTopics = plateauDetected
      ? topicProgress
          .filter((tp) => {
            const accuracy =
              tp.questionsAttempted > 0
                ? (tp.questionsCorrect / tp.questionsAttempted) * 100
                : 0;
            return accuracy < 75 && tp.questionsAttempted >= 10;
          })
          .map((tp) => tp.topic?.name || 'Unknown')
      : [];

    return {
      overallLearningSpeed: {
        averageDaysToTopicMastery: parseFloat(averageDaysToMastery.toFixed(2)),
        averageAttemptsToMastery: parseFloat(
          averageAttemptsToMastery.toFixed(2),
        ),
        learningVelocity,
      },
      speedByTopic,
      learningCurve: {
        improvementRate: parseFloat(improvementRate.toFixed(2)),
        accelerationPhase: improvementRate > 10,
        plateauDetected,
        plateauTopics,
      },
    };
  }

  // ==================== Milestone Tracking - REMOVED ====================
  // Milestones are now removed from the analytics system

  // ==================== Recommendations ====================

  private generateRecommendations(
    accuracyProgression: AccuracyProgression,
    difficultyAdvancement: DifficultyAdvancement,
    curriculumProgress: CurriculumCompletion,
    learningSpeed: LearningSpeedMetrics,
    topicProgress: any[],
  ): ProgressRecommendations {
    const recommendations: Recommendation[] = [];
    const strengths: Array<{
      area: string;
      description: string;
      suggestion: string;
    }> = [];
    const areasForImprovement: Array<{
      area: string;
      currentStatus: string;
      targetStatus: string;
      gap: string;
      recommendation: string;
    }> = [];

    // Check for plateau
    if (learningSpeed.learningCurve.plateauDetected) {
      recommendations.push({
        type: 'Strategy',
        priority: 'High',
        title: 'Break Through Your Learning Plateau',
        description: `Your accuracy has been stable for the past few weeks`,
        reasoning:
          'Plateaus are normal but can be overcome with strategy changes',
        actionItems: [
          'Try harder difficulty questions to challenge yourself',
          'Revisit fundamentals in topics where you plateau',
          'Take practice exams to simulate real conditions',
          'Focus on understanding concepts deeply, not just answering questions',
        ],
        expectedImpact: {
          metric: 'Overall Accuracy',
          currentValue:
            accuracyProgression.accuracyOverTime[
              accuracyProgression.accuracyOverTime.length - 1
            ]?.accuracy || 0,
          projectedValue:
            (accuracyProgression.accuracyOverTime[
              accuracyProgression.accuracyOverTime.length - 1
            ]?.accuracy || 0) + 5,
          timeframe: '2 weeks',
        },
      });
    }

    // Check difficulty progression
    if (
      !difficultyAdvancement.difficultyProgression.isProgressing &&
      difficultyAdvancement.difficultyProgression.readyForNextLevel
    ) {
      recommendations.push({
        type: 'Difficulty',
        priority: 'High',
        title: 'Ready for Harder Challenges',
        description: `You're performing well on ${difficultyAdvancement.challengeAdoption.comfortZone} questions`,
        reasoning: 'High performance suggests readiness for advancement',
        actionItems: [
          `Start attempting ${difficultyAdvancement.difficultyProgression.recommendedDifficulty} difficulty questions`,
          'Aim for at least 20% challenging questions in your practice',
          'Use progressive difficulty to build confidence',
        ],
        expectedImpact: {
          metric: 'Hard Question Success Rate',
          currentValue:
            difficultyAdvancement.difficultyProgression
              .hardQuestionsSuccessRate,
          projectedValue: 60,
          timeframe: '3 weeks',
        },
      });
    }

    // Check curriculum coverage
    const coveragePercentage =
      curriculumProgress.overallCompletion.completionPercentage;
    if (coveragePercentage < 50) {
      const untouchedTopics = curriculumProgress.topicCompletion
        .filter((tc) => tc.questionsAttempted === 0)
        .slice(0, 3)
        .map((tc) => tc.topicName)
        .join(', ');

      recommendations.push({
        type: 'Topic',
        priority: 'Medium',
        title: 'Expand Your Topic Coverage',
        description: `You've completed ${coveragePercentage.toFixed(1)}% of the curriculum`,
        reasoning: 'Broader coverage improves overall understanding',
        actionItems: [
          `Try these topics: ${untouchedTopics}`,
          'Aim to touch at least 3 new topics this week',
          'Balance depth in current topics with breadth',
        ],
        expectedImpact: {
          metric: 'Curriculum Coverage',
          currentValue: coveragePercentage,
          projectedValue: Math.min(coveragePercentage + 15, 100),
          timeframe: '2 weeks',
        },
      });
    }

    // Identify strengths
    if (accuracyProgression.overallTrend.direction === 'Improving') {
      strengths.push({
        area: 'Learning Trajectory',
        description: `You're on an upward trend with ${accuracyProgression.overallTrend.trendPercentage.toFixed(1)}% improvement`,
        suggestion:
          'Maintain your current study habits and consider increasing difficulty',
      });
    }

    if (difficultyAdvancement.challengeAdoption.growthMindset) {
      strengths.push({
        area: 'Growth Mindset',
        description:
          "You're actively challenging yourself with harder questions",
        suggestion:
          'Continue this pattern and track your progress on difficult topics',
      });
    }

    // Areas for improvement
    if (learningSpeed.learningCurve.plateauTopics.length > 0) {
      areasForImprovement.push({
        area: 'Plateaued Topics',
        currentStatus: `Stuck on ${learningSpeed.learningCurve.plateauTopics.length} topics`,
        targetStatus: 'Breakthrough to next mastery level',
        gap: `${learningSpeed.learningCurve.plateauTopics.join(', ')} need attention`,
        recommendation: 'Focus on understanding core concepts in these topics',
      });
    }

    // Next best actions
    const nextBestActions: Array<{
      action: string;
      reason: string;
      priority: number;
    }> = [];

    if (recommendations.length > 0) {
      nextBestActions.push({
        action: recommendations[0].actionItems[0],
        reason: recommendations[0].reasoning,
        priority: 1,
      });
    }

    return {
      recommendations,
      strengths,
      areasForImprovement,
      nextBestActions,
    };
  }
}
