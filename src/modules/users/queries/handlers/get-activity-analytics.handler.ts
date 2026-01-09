import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetActivityAnalyticsQuery } from '../get-activity-analytics.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

interface SessionAnalytics {
  totalSessions: number;
  totalMinutes: number;
  averageSessionDuration: number;
  longestSession: number;
  shortestSession: number;
  timeByType: {
    practice: number;
    exam: number;
    homework: number;
  };
  timeByTopic: Array<{
    topicId: string;
    topicName: string;
    minutes: number;
    percentage: number;
  }>;
}

interface HourlyDistribution {
  hour: number;
  submissionCount: number;
  minutesSpent: number;
}

interface WeekdayDistribution {
  day: string;
  dayIndex: number;
  submissionCount: number;
  minutesSpent: number;
  averageAccuracy: number;
}

interface ActivityPatterns {
  hourlyDistribution: HourlyDistribution[];
  weekdayDistribution: WeekdayDistribution[];
  peakStudyHour: string;
  peakStudyDay: string;
  activityHeatmap: number[][];
}

interface StreakAnalytics {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  lastActivity: Date | null;
  streakAtRisk: boolean;
  hoursUntilStreakBreak: number;
  streakComparison: {
    currentVsLongest: number;
    daysToLongest: number;
  };
}

interface ConsistencyMetrics {
  daysActive: number;
  daysInactive: number;
  consistencyScore: number;
  longestGap: number;
  currentGap: number;
  averageGapBetweenSessions: number;
  studyRegularity: 'veryRegular' | 'regular' | 'sporadic' | 'inconsistent';
}

interface SubmissionFrequency {
  totalSubmissions: number;
  byStatus: {
    inProgress: number;
    submitted: number;
    graded: number;
  };
  byType: {
    practice: number;
    exam: number;
    homework: number;
  };
  submissionsToday: number;
  submissionsThisWeek: number;
  submissionsThisMonth: number;
  averagePerDay: number;
  averagePerWeek: number;
}

interface CompletionPatterns {
  completionRate: number;
  submissionRate: number;
  abandonmentRate: number;
  averageCompletionTime: number;
  completionTimeByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface TopicAccess {
  topicId: string;
  topicName: string;
  moduleName: string;
  accessCount: number;
  lastAccessedAt: Date | null;
  daysSinceLastAccess: number | null;
  totalMinutes: number;
  averageMinutesPerSession: number;
  isFavorite: boolean;
  activityLevel: 'High' | 'Medium' | 'Low' | 'Dormant';
}

interface TopicAccessPatterns {
  totalTopicsAvailable: number;
  topicsAccessed: number;
  topicsNotTouched: number;
  coveragePercentage: number;
  topicAccessList: TopicAccess[];
  mostAccessedTopics: TopicAccess[];
  leastAccessedTopics: TopicAccess[];
  dormantTopics: TopicAccess[];
}

interface FavoritesAnalytics {
  totalFavorites: number;
  favoriteVsNonFavorite: {
    favorites: {
      avgTimeSpent: number;
      avgAccuracy: number;
      totalAttempts: number;
    };
    nonFavorites: {
      avgTimeSpent: number;
      avgAccuracy: number;
      totalAttempts: number;
    };
  };
}

interface LearningCoverage {
  moduleCoverage: Array<{
    moduleId: string;
    moduleName: string;
    totalTopics: number;
    topicsStarted: number;
    topicsCompleted: number;
    coveragePercentage: number;
  }>;
  learningProfile: {
    breadth: number;
    depth: number;
    style: 'Explorer' | 'Deep Diver' | 'Balanced' | 'Starter';
  };
}

interface AiInteractionMetrics {
  totalAiInteractions: number;
  totalHintsRequested: number;
  aiUsageByTopic: Array<{
    topicName: string;
    interactionCount: number;
    hintCount: number;
    dependencyScore: number;
  }>;
  aiEffectiveness: {
    totalEvaluations: number;
    successfulHelps: number;
    successRate: number;
  };
  aiDependency: {
    level: 'High' | 'Medium' | 'Low';
    hintsPerQuestion: number;
    improvementTrend: 'Decreasing' | 'Stable' | 'Increasing';
  };
}

interface ScheduleCompliance {
  scheduledSessions: number;
  totalScheduledMinutes: number;
  sessionsAttended: number;
  sessionsSkipped: number;
  adherenceRate: number;
  adherenceByDay: Array<{
    day: string;
    scheduledMinutes: number;
    actualMinutes: number;
    adherencePercentage: number;
  }>;
  offScheduleActivity: {
    totalMinutes: number;
    percentage: number;
  };
}

interface ActivityAnalytics {
  timeActivity: SessionAnalytics;
  activityPatterns: ActivityPatterns;
  engagement: {
    streak: StreakAnalytics;
    consistency: ConsistencyMetrics;
  };
  submissions: {
    frequency: SubmissionFrequency;
    completion: CompletionPatterns;
  };
  topicEngagement: {
    accessPatterns: TopicAccessPatterns;
    favorites: FavoritesAnalytics;
    learningCoverage: LearningCoverage;
  };
  aiAssistance?: AiInteractionMetrics;
  scheduleCompliance?: ScheduleCompliance;
}

@QueryHandler(GetActivityAnalyticsQuery)
export class GetActivityAnalyticsHandler
  implements IQueryHandler<GetActivityAnalyticsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetActivityAnalyticsQuery): Promise<ActivityAnalytics> {
    const {
      studentId,
      startDate,
      endDate,
      topicId,
      moduleId,
      includeAi,
      includeSchedule,
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

    if (topicId || moduleId) {
      submissionFilter.question = {};
      if (topicId) submissionFilter.question.topicId = topicId;
      if (moduleId) submissionFilter.question.moduleId = moduleId;
    }

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
          beganAt: 'desc',
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

    const timeActivity = this.calculateSessionAnalytics(submissions);
    const activityPatterns = this.calculateActivityPatterns(submissions);
    const streak = this.calculateStreakAnalytics(student);
    const consistency = this.calculateConsistencyMetrics(submissions, student);
    const frequency = this.calculateSubmissionFrequency(submissions);
    const completion = this.calculateCompletionPatterns(submissions);
    const accessPatterns = this.calculateTopicAccessPatterns(
      topicProgress,
      submissions,
      allTopics,
    );
    const favorites = this.calculateFavoritesAnalytics(
      topicProgress,
      submissions,
    );
    const learningCoverage = this.calculateLearningCoverage(
      topicProgress,
      allTopics,
      modules,
      submissions,
    );

    const result: ActivityAnalytics = {
      timeActivity,
      activityPatterns,
      engagement: {
        streak,
        consistency,
      },
      submissions: {
        frequency,
        completion,
      },
      topicEngagement: {
        accessPatterns,
        favorites,
        learningCoverage,
      },
    };

    if (includeAi) {
      const [historyRecords, aiResponses] = await Promise.all([
        this.prisma.history.findMany({
          where: {
            userId: student.authId,
            ...(Object.keys(dateFilter).length > 0 && {}),
          },
        }),
        this.prisma.aiResponse.findMany({
          where: {
            questionId: {
              in: submissions.map((s) => s.questionId),
            },
          },
        }),
      ]);

      result.aiAssistance = this.calculateAiInteractionMetrics(
        historyRecords,
        aiResponses,
        submissions,
      );
    }

    if (includeSchedule) {
      const schedule = await this.prisma.studentSchedule.findMany({
        where: {
          studentId,
        },
        include: {
          module: true,
        },
      });

      result.scheduleCompliance = this.calculateScheduleCompliance(
        schedule,
        submissions,
      );
    }

    return result;
  }

  private calculateSessionAnalytics(submissions: any[]): SessionAnalytics {
    const sessionsWithTime = submissions.filter((s) => s.beganAt && s.endedAt);

    if (sessionsWithTime.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        averageSessionDuration: 0,
        longestSession: 0,
        shortestSession: 0,
        timeByType: { practice: 0, exam: 0, homework: 0 },
        timeByTopic: [],
      };
    }

    const durations = sessionsWithTime.map((s) => {
      const duration =
        (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) / 60000;
      return { submission: s, duration };
    });

    const totalMinutes = durations.reduce((sum, d) => sum + d.duration, 0);
    const longestSession = Math.max(...durations.map((d) => d.duration));
    const shortestSession = Math.min(...durations.map((d) => d.duration));

    const timeByType = {
      practice: 0,
      exam: 0,
      homework: 0,
    };

    durations.forEach(({ submission, duration }) => {
      const type = submission.type.toLowerCase() as
        | 'practice'
        | 'exam'
        | 'homework';
      if (type in timeByType) {
        timeByType[type] += duration;
      }
    });

    const topicTimeMap = new Map<string, { name: string; minutes: number }>();

    durations.forEach(({ submission, duration }) => {
      const topicId = submission.question?.topicId;
      const topicName = submission.question?.topic?.name || 'Unknown';

      if (topicId) {
        if (!topicTimeMap.has(topicId)) {
          topicTimeMap.set(topicId, { name: topicName, minutes: 0 });
        }
        topicTimeMap.get(topicId)!.minutes += duration;
      }
    });

    const timeByTopic = Array.from(topicTimeMap.entries())
      .map(([topicId, data]) => ({
        topicId,
        topicName: data.name,
        minutes: parseFloat(data.minutes.toFixed(2)),
        percentage: parseFloat(
          ((data.minutes / totalMinutes) * 100).toFixed(2),
        ),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return {
      totalSessions: sessionsWithTime.length,
      totalMinutes: parseFloat(totalMinutes.toFixed(2)),
      averageSessionDuration: parseFloat(
        (totalMinutes / sessionsWithTime.length).toFixed(2),
      ),
      longestSession: parseFloat(longestSession.toFixed(2)),
      shortestSession: parseFloat(shortestSession.toFixed(2)),
      timeByType,
      timeByTopic,
    };
  }

  private calculateActivityPatterns(submissions: any[]): ActivityPatterns {
    const hourlyMap = new Map<number, { count: number; minutes: number }>();
    const weekdayMap = new Map<
      number,
      {
        count: number;
        minutes: number;
        correctCount: number;
        totalCount: number;
      }
    >();

    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { count: 0, minutes: 0 });
    }
    for (let i = 0; i < 7; i++) {
      weekdayMap.set(i, {
        count: 0,
        minutes: 0,
        correctCount: 0,
        totalCount: 0,
      });
    }

    const activityHeatmap: number[][] = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    submissions.forEach((s) => {
      const date = new Date(s.beganAt);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      const hourData = hourlyMap.get(hour)!;
      hourData.count++;

      const dayData = weekdayMap.get(dayOfWeek)!;
      dayData.count++;
      dayData.totalCount++;
      if (s.correctAnswersCount && s.correctAnswersCount > 0) {
        dayData.correctCount += s.correctAnswersCount;
      }

      activityHeatmap[dayOfWeek][hour]++;

      if (s.endedAt) {
        const duration =
          (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) /
          60000;
        hourData.minutes += duration;
        dayData.minutes += duration;
      }
    });

    const hourlyDistribution: HourlyDistribution[] = Array.from(
      hourlyMap.entries(),
    ).map(([hour, data]) => ({
      hour,
      submissionCount: data.count,
      minutesSpent: parseFloat(data.minutes.toFixed(2)),
    }));

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const weekdayDistribution: WeekdayDistribution[] = Array.from(
      weekdayMap.entries(),
    ).map(([dayIndex, data]) => ({
      day: dayNames[dayIndex],
      dayIndex,
      submissionCount: data.count,
      minutesSpent: parseFloat(data.minutes.toFixed(2)),
      averageAccuracy:
        data.totalCount > 0
          ? parseFloat(((data.correctCount / data.totalCount) * 100).toFixed(2))
          : 0,
    }));

    const peakHour = hourlyDistribution.reduce((max, curr) =>
      curr.submissionCount > max.submissionCount ? curr : max,
    );
    const peakDay = weekdayDistribution.reduce((max, curr) =>
      curr.submissionCount > max.submissionCount ? curr : max,
    );

    return {
      hourlyDistribution,
      weekdayDistribution,
      peakStudyHour: `${peakHour.hour}:00-${peakHour.hour + 1}:00`,
      peakStudyDay: peakDay.day,
      activityHeatmap,
    };
  }

  private calculateStreakAnalytics(student: any): StreakAnalytics {
    const now = new Date();
    const lastActivity = student.lastActivity
      ? new Date(student.lastActivity)
      : null;

    let streakAtRisk = false;
    let hoursUntilStreakBreak = 24;

    if (lastActivity) {
      const hoursSinceActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      streakAtRisk = hoursSinceActivity > 20;
      hoursUntilStreakBreak = Math.max(0, 24 - hoursSinceActivity);
    }

    const currentStreak = student.currentStreak || 0;
    const longestStreak = student.longestStreak || 0;

    return {
      currentStreak,
      longestStreak,
      totalXp: student.totalXp || 0,
      lastActivity,
      streakAtRisk,
      hoursUntilStreakBreak: parseFloat(hoursUntilStreakBreak.toFixed(2)),
      streakComparison: {
        currentVsLongest:
          longestStreak > 0
            ? parseFloat(((currentStreak / longestStreak) * 100).toFixed(2))
            : 0,
        daysToLongest: Math.max(0, longestStreak - currentStreak),
      },
    };
  }

  private calculateConsistencyMetrics(
    submissions: any[],
    student: any,
  ): ConsistencyMetrics {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = submissions.filter(
      (s) => new Date(s.beganAt) >= thirtyDaysAgo,
    );

    const uniqueDates = [
      ...new Set(
        recentSubmissions.map((s) => new Date(s.beganAt).toDateString()),
      ),
    ];

    const daysActive = uniqueDates.length;
    const daysInactive = 30 - daysActive;
    const consistencyScore = (daysActive / 30) * 100;

    const sortedDates = uniqueDates
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const gap =
        (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) /
        (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    const longestGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    const averageGapBetweenSessions =
      gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

    const now = new Date();
    const lastActivity = student.lastActivity
      ? new Date(student.lastActivity)
      : now;
    const currentGap =
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    let studyRegularity:
      | 'veryRegular'
      | 'regular'
      | 'sporadic'
      | 'inconsistent';
    if (daysActive >= 25) studyRegularity = 'veryRegular';
    else if (daysActive >= 15) studyRegularity = 'regular';
    else if (daysActive >= 5) studyRegularity = 'sporadic';
    else studyRegularity = 'inconsistent';

    return {
      daysActive,
      daysInactive,
      consistencyScore: parseFloat(consistencyScore.toFixed(2)),
      longestGap: parseFloat(longestGap.toFixed(2)),
      currentGap: parseFloat(currentGap.toFixed(2)),
      averageGapBetweenSessions: parseFloat(
        averageGapBetweenSessions.toFixed(2),
      ),
      studyRegularity,
    };
  }

  private calculateSubmissionFrequency(
    submissions: any[],
  ): SubmissionFrequency {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const submissionsToday = submissions.filter(
      (s) => new Date(s.beganAt) >= today,
    ).length;

    const submissionsThisWeek = submissions.filter(
      (s) => new Date(s.beganAt) >= weekAgo,
    ).length;

    const submissionsThisMonth = submissions.filter(
      (s) => new Date(s.beganAt) >= monthAgo,
    ).length;

    const byStatus = {
      inProgress: submissions.filter((s) => s.status === 'InProgress').length,
      submitted: submissions.filter((s) => s.status === 'Submitted').length,
      graded: submissions.filter((s) => s.status === 'Graded').length,
    };

    const byType = {
      practice: submissions.filter((s) => s.type === 'Practice').length,
      exam: submissions.filter((s) => s.type === 'Exam').length,
      homework: submissions.filter((s) => s.type === 'Homework').length,
    };

    return {
      totalSubmissions: submissions.length,
      byStatus,
      byType,
      submissionsToday,
      submissionsThisWeek,
      submissionsThisMonth,
      averagePerDay: parseFloat((submissionsThisMonth / 30).toFixed(2)),
      averagePerWeek: parseFloat((submissionsThisMonth / 4.3).toFixed(2)),
    };
  }

  private calculateCompletionPatterns(submissions: any[]): CompletionPatterns {
    const total = submissions.length;
    const graded = submissions.filter((s) => s.status === 'Graded').length;
    const voided = submissions.filter((s) => s.voided).length;

    const completionRate = total > 0 ? (graded / total) * 100 : 0;
    const submissionRate =
      total > 0
        ? ((graded +
            submissions.filter((s) => s.status === 'Submitted').length) /
            total) *
          100
        : 0;
    const abandonmentRate = total > 0 ? (voided / total) * 100 : 0;

    const submissionsWithTime = submissions.filter(
      (s) => s.beganAt && s.endedAt,
    );
    const totalCompletionTime = submissionsWithTime.reduce((sum, s) => {
      return (
        sum +
        (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) / 60000
      );
    }, 0);

    const averageCompletionTime =
      submissionsWithTime.length > 0
        ? totalCompletionTime / submissionsWithTime.length
        : 0;

    const difficultyTimes = {
      easy: [] as number[],
      medium: [] as number[],
      hard: [] as number[],
    };

    submissionsWithTime.forEach((s) => {
      const difficulty = s.question?.difficultyLevel?.toLowerCase();
      const duration =
        (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) / 60000;

      if (difficulty && difficulty in difficultyTimes) {
        difficultyTimes[difficulty as keyof typeof difficultyTimes].push(
          duration,
        );
      }
    });

    return {
      completionRate: parseFloat(completionRate.toFixed(2)),
      submissionRate: parseFloat(submissionRate.toFixed(2)),
      abandonmentRate: parseFloat(abandonmentRate.toFixed(2)),
      averageCompletionTime: parseFloat(averageCompletionTime.toFixed(2)),
      completionTimeByDifficulty: {
        easy:
          difficultyTimes.easy.length > 0
            ? parseFloat(
                (
                  difficultyTimes.easy.reduce((a, b) => a + b, 0) /
                  difficultyTimes.easy.length
                ).toFixed(2),
              )
            : 0,
        medium:
          difficultyTimes.medium.length > 0
            ? parseFloat(
                (
                  difficultyTimes.medium.reduce((a, b) => a + b, 0) /
                  difficultyTimes.medium.length
                ).toFixed(2),
              )
            : 0,
        hard:
          difficultyTimes.hard.length > 0
            ? parseFloat(
                (
                  difficultyTimes.hard.reduce((a, b) => a + b, 0) /
                  difficultyTimes.hard.length
                ).toFixed(2),
              )
            : 0,
      },
    };
  }

  private calculateTopicAccessPatterns(
    topicProgress: any[],
    submissions: any[],
    allTopics: any[],
  ): TopicAccessPatterns {
    const totalTopicsAvailable = allTopics.length;
    const topicsAccessed = topicProgress.length;
    const topicsNotTouched = totalTopicsAvailable - topicsAccessed;
    const coveragePercentage =
      totalTopicsAvailable > 0
        ? (topicsAccessed / totalTopicsAvailable) * 100
        : 0;

    const topicAccessList: TopicAccess[] = topicProgress.map((progress) => {
      const topicSubmissions = submissions.filter(
        (s) => s.question?.topicId === progress.topicId,
      );

      const accessCount = topicSubmissions.length;

      const totalMinutes = topicSubmissions.reduce((sum, s) => {
        if (s.beganAt && s.endedAt) {
          return (
            sum +
            (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) /
              60000
          );
        }
        return sum;
      }, 0);

      const now = new Date();
      const daysSinceLastAccess = progress.lastAccessedAt
        ? (now.getTime() - new Date(progress.lastAccessedAt).getTime()) /
          (1000 * 60 * 60 * 24)
        : null;

      let activityLevel: 'High' | 'Medium' | 'Low' | 'Dormant';
      if (daysSinceLastAccess && daysSinceLastAccess > 14) {
        activityLevel = 'Dormant';
      } else if (accessCount >= 10) {
        activityLevel = 'High';
      } else if (accessCount >= 5) {
        activityLevel = 'Medium';
      } else {
        activityLevel = 'Low';
      }

      return {
        topicId: progress.topicId,
        topicName: progress.topic?.name || 'Unknown',
        moduleName: progress.topic?.module?.name || 'Unknown',
        accessCount,
        lastAccessedAt: progress.lastAccessedAt,
        daysSinceLastAccess: daysSinceLastAccess
          ? parseFloat(daysSinceLastAccess.toFixed(2))
          : null,
        totalMinutes: parseFloat(totalMinutes.toFixed(2)),
        averageMinutesPerSession:
          accessCount > 0
            ? parseFloat((totalMinutes / accessCount).toFixed(2))
            : 0,
        isFavorite: progress.isFavorite || false,
        activityLevel,
      };
    });

    const sortedByAccess = [...topicAccessList].sort(
      (a, b) => b.accessCount - a.accessCount,
    );

    return {
      totalTopicsAvailable,
      topicsAccessed,
      topicsNotTouched,
      coveragePercentage: parseFloat(coveragePercentage.toFixed(2)),
      topicAccessList,
      mostAccessedTopics: sortedByAccess.slice(0, 5),
      leastAccessedTopics: sortedByAccess.reverse().slice(0, 5),
      dormantTopics: topicAccessList.filter(
        (t) => t.activityLevel === 'Dormant',
      ),
    };
  }

  private calculateFavoritesAnalytics(
    topicProgress: any[],
    submissions: any[],
  ): FavoritesAnalytics {
    const favorites = topicProgress.filter((p) => p.isFavorite);
    const favoriteTopicIds = new Set(favorites.map((f) => f.topicId));

    const favoriteSubmissions = submissions.filter((s) =>
      favoriteTopicIds.has(s.question?.topicId),
    );
    const nonFavoriteSubmissions = submissions.filter(
      (s) => !favoriteTopicIds.has(s.question?.topicId),
    );

    const calcMetrics = (subs: any[]) => {
      const totalTime = subs.reduce((sum, s) => {
        if (s.beganAt && s.endedAt) {
          return (
            sum +
            (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) /
              60000
          );
        }
        return sum;
      }, 0);

      const totalCorrect = subs.reduce(
        (sum, s) => sum + (s.correctAnswersCount || 0),
        0,
      );

      return {
        avgTimeSpent: subs.length > 0 ? totalTime / subs.length : 0,
        avgAccuracy: subs.length > 0 ? (totalCorrect / subs.length) * 100 : 0,
        totalAttempts: subs.length,
      };
    };

    const favMetrics = calcMetrics(favoriteSubmissions);
    const nonFavMetrics = calcMetrics(nonFavoriteSubmissions);

    return {
      totalFavorites: favorites.length,
      favoriteVsNonFavorite: {
        favorites: {
          avgTimeSpent: parseFloat(favMetrics.avgTimeSpent.toFixed(2)),
          avgAccuracy: parseFloat(favMetrics.avgAccuracy.toFixed(2)),
          totalAttempts: favMetrics.totalAttempts,
        },
        nonFavorites: {
          avgTimeSpent: parseFloat(nonFavMetrics.avgTimeSpent.toFixed(2)),
          avgAccuracy: parseFloat(nonFavMetrics.avgAccuracy.toFixed(2)),
          totalAttempts: nonFavMetrics.totalAttempts,
        },
      },
    };
  }

  private calculateLearningCoverage(
    topicProgress: any[],
    allTopics: any[],
    modules: any[],
    submissions: any[],
  ): LearningCoverage {
    const moduleCoverage = modules.map((module) => {
      const moduleTopics = allTopics.filter((t) => t.moduleId === module.id);
      const startedTopics = topicProgress.filter((tp) =>
        moduleTopics.some((mt) => mt.id === tp.topicId),
      );

      const completedTopics = startedTopics.filter((tp) => {
        const accuracy =
          tp.questionsAttempted > 0
            ? (tp.questionsCorrect / tp.questionsAttempted) * 100
            : 0;
        return accuracy >= 75 && tp.questionsAttempted >= 10;
      });

      return {
        moduleId: module.id,
        moduleName: module.name,
        totalTopics: moduleTopics.length,
        topicsStarted: startedTopics.length,
        topicsCompleted: completedTopics.length,
        coveragePercentage:
          moduleTopics.length > 0
            ? parseFloat(
                ((startedTopics.length / moduleTopics.length) * 100).toFixed(2),
              )
            : 0,
      };
    });

    const breadth =
      allTopics.length > 0
        ? (topicProgress.length / allTopics.length) * 100
        : 0;
    const depth =
      topicProgress.length > 0 ? submissions.length / topicProgress.length : 0;

    let style: 'Explorer' | 'Deep Diver' | 'Balanced' | 'Starter';
    if (breadth > 70 && depth < 5) {
      style = 'Explorer';
    } else if (breadth < 30 && depth > 10) {
      style = 'Deep Diver';
    } else if (breadth > 40 && depth > 5) {
      style = 'Balanced';
    } else {
      style = 'Starter';
    }

    return {
      moduleCoverage,
      learningProfile: {
        breadth: parseFloat(breadth.toFixed(2)),
        depth: parseFloat(depth.toFixed(2)),
        style,
      },
    };
  }

  private calculateAiInteractionMetrics(
    historyRecords: any[],
    aiResponses: any[],
    submissions: any[],
  ): AiInteractionMetrics {
    const totalAiInteractions = historyRecords.length + aiResponses.length;
    const totalHintsRequested = historyRecords.filter((h) => h.hint).length;

    const topicAiMap = new Map<
      string,
      { topicName: string; interactions: number; hints: number }
    >();

    historyRecords.forEach((h) => {
      const question = submissions.find((s) => s.questionId === h.questionId);
      if (question?.question?.topicId) {
        const topicId = question.question.topicId;
        const topicName = question.question.topic?.name || 'Unknown';

        if (!topicAiMap.has(topicId)) {
          topicAiMap.set(topicId, { topicName, interactions: 0, hints: 0 });
        }

        const data = topicAiMap.get(topicId)!;
        data.interactions++;
        if (h.hint) data.hints++;
      }
    });

    const aiUsageByTopic = Array.from(topicAiMap.entries())
      .map(([topicId, data]) => {
        const topicSubmissions = submissions.filter(
          (s) => s.question?.topicId === topicId,
        );
        return {
          topicName: data.topicName,
          interactionCount: data.interactions,
          hintCount: data.hints,
          dependencyScore:
            topicSubmissions.length > 0
              ? parseFloat((data.hints / topicSubmissions.length).toFixed(2))
              : 0,
        };
      })
      .sort((a, b) => b.dependencyScore - a.dependencyScore);

    const evaluatedRecords = historyRecords.filter((h) => h.verdict !== null);
    const successfulHelps = evaluatedRecords.filter(
      (h) => h.verdict === true,
    ).length;
    const successRate =
      evaluatedRecords.length > 0
        ? (successfulHelps / evaluatedRecords.length) * 100
        : 0;

    const hintsPerQuestion =
      submissions.length > 0 ? totalHintsRequested / submissions.length : 0;

    let level: 'High' | 'Medium' | 'Low';
    if (hintsPerQuestion > 0.5) level = 'High';
    else if (hintsPerQuestion > 0.2) level = 'Medium';
    else level = 'Low';

    return {
      totalAiInteractions,
      totalHintsRequested,
      aiUsageByTopic: aiUsageByTopic.slice(0, 10),
      aiEffectiveness: {
        totalEvaluations: evaluatedRecords.length,
        successfulHelps,
        successRate: parseFloat(successRate.toFixed(2)),
      },
      aiDependency: {
        level,
        hintsPerQuestion: parseFloat(hintsPerQuestion.toFixed(2)),
        improvementTrend: 'Stable',
      },
    };
  }

  private calculateScheduleCompliance(
    schedule: any[],
    submissions: any[],
  ): ScheduleCompliance {
    if (schedule.length === 0) {
      return {
        scheduledSessions: 0,
        totalScheduledMinutes: 0,
        sessionsAttended: 0,
        sessionsSkipped: 0,
        adherenceRate: 0,
        adherenceByDay: [],
        offScheduleActivity: {
          totalMinutes: 0,
          percentage: 0,
        },
      };
    }

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const totalScheduledMinutes = schedule.reduce((sum, s) => {
      const [startHour, startMin] = s.startTime.split(':').map(Number);
      const [endHour, endMin] = s.endTime.split(':').map(Number);
      const duration = endHour * 60 + endMin - (startHour * 60 + startMin);
      return sum + duration;
    }, 0);

    const adherenceByDay = schedule.map((scheduleEntry) => {
      const { day, startTime, endTime } = scheduleEntry;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const scheduledMinutes =
        endHour * 60 + endMin - (startHour * 60 + startMin);

      const matchingSubmissions = submissions.filter((s) => {
        const date = new Date(s.beganAt);
        const submissionDay = dayNames[date.getDay()];
        const submissionHour = date.getHours();
        const submissionMin = date.getMinutes();
        const submissionTime = submissionHour * 60 + submissionMin;

        return (
          submissionDay === day &&
          submissionTime >= startHour * 60 + startMin &&
          submissionTime <= endHour * 60 + endMin
        );
      });

      const actualMinutes = matchingSubmissions.reduce((sum, s) => {
        if (s.beganAt && s.endedAt) {
          return (
            sum +
            (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) /
              60000
          );
        }
        return sum;
      }, 0);

      return {
        day,
        scheduledMinutes,
        actualMinutes: parseFloat(actualMinutes.toFixed(2)),
        adherencePercentage:
          scheduledMinutes > 0
            ? parseFloat(
                Math.min((actualMinutes / scheduledMinutes) * 100, 100).toFixed(
                  2,
                ),
              )
            : 0,
      };
    });

    const totalActualScheduledMinutes = adherenceByDay.reduce(
      (sum, d) => sum + d.actualMinutes,
      0,
    );

    const totalActivityMinutes = submissions.reduce((sum, s) => {
      if (s.beganAt && s.endedAt) {
        return (
          sum +
          (new Date(s.endedAt).getTime() - new Date(s.beganAt).getTime()) /
            60000
        );
      }
      return sum;
    }, 0);

    const offScheduleMinutes =
      totalActivityMinutes - totalActualScheduledMinutes;

    return {
      scheduledSessions: schedule.length,
      totalScheduledMinutes,
      sessionsAttended: adherenceByDay.filter((d) => d.actualMinutes > 0)
        .length,
      sessionsSkipped: adherenceByDay.filter((d) => d.actualMinutes === 0)
        .length,
      adherenceRate:
        totalScheduledMinutes > 0
          ? parseFloat(
              (
                (totalActualScheduledMinutes / totalScheduledMinutes) *
                100
              ).toFixed(2),
            )
          : 0,
      adherenceByDay,
      offScheduleActivity: {
        totalMinutes: parseFloat(Math.max(0, offScheduleMinutes).toFixed(2)),
        percentage:
          totalActivityMinutes > 0
            ? parseFloat(
                ((offScheduleMinutes / totalActivityMinutes) * 100).toFixed(2),
              )
            : 0,
      },
    };
  }
}
