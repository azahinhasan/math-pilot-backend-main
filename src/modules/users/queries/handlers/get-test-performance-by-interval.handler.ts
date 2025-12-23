import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTestPerformanceByIntervalQuery } from '../get-test-performance-by-interval.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DifficultyLevel, SubmissionStatus } from '@prisma/client';
import { TimeInterval } from '../../dto/get-test-performance-by-interval.dto';

interface IntervalPerformance {
  intervalStart: Date;
  intervalEnd: Date;
  intervalLabel: string;
  weightedMarksPercentage: number;
  accuracyRatio: number;
  totalSubmissions: number;
  totalMarksAttempted: number;
  totalMarksAwarded: number;
  questionsFullyCorrect: number;
  totalQuestions: number;
}

interface TestPerformanceByInterval {
  studentId: string;
  interval: TimeInterval;
  startDate: Date;
  endDate: Date;
  performanceData: IntervalPerformance[];
}

@QueryHandler(GetTestPerformanceByIntervalQuery)
export class GetTestPerformanceByIntervalHandler
  implements IQueryHandler<GetTestPerformanceByIntervalQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetTestPerformanceByIntervalQuery,
  ): Promise<TestPerformanceByInterval> {
    const { studentId, interval, startDate, endDate, submissionType, subject } =
      query;

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const end = endDate || new Date();
    const start = startDate || this.getDefaultStartDate(interval, end);

    const whereClause: any = {
      studentId,
      status: SubmissionStatus.Graded,
      voided: false,
      beganAt: {
        gte: start,
        lte: end,
      },
    };

    if (submissionType) {
      whereClause.type = submissionType;
    }

    if (subject) {
      whereClause.question = {
        module: {
          subject: subject,
        },
      };
    }

    const submissions = await this.prisma.submission.findMany({
      where: whereClause,
      include: {
        question: {
          select: {
            difficulty_level: true,
            totalMarks: true,
          },
        },
      },
      orderBy: {
        beganAt: 'asc',
      },
    });

    const intervalBuckets = this.groupByInterval(
      submissions,
      interval,
      start,
      end,
    );

    const performanceData = intervalBuckets.map((bucket) =>
      this.calculateIntervalPerformance(bucket),
    );

    return {
      studentId,
      interval,
      startDate: start,
      endDate: end,
      performanceData,
    };
  }

  private getDefaultStartDate(interval: TimeInterval, endDate: Date): Date {
    const start = new Date(endDate);

    switch (interval) {
      case TimeInterval.DAY:
        start.setDate(start.getDate() - 30);
        break;
      case TimeInterval.WEEK:
        start.setDate(start.getDate() - 12 * 7);
        break;
      case TimeInterval.MONTH:
        start.setMonth(start.getMonth() - 12);
        break;
    }

    return start;
  }

  private groupByInterval(
    submissions: any[],
    interval: TimeInterval,
    startDate: Date,
    endDate: Date,
  ): Array<{
    intervalStart: Date;
    intervalEnd: Date;
    intervalLabel: string;
    submissions: any[];
  }> {
    const buckets: Array<{
      intervalStart: Date;
      intervalEnd: Date;
      intervalLabel: string;
      submissions: any[];
    }> = [];

    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const bucketStart = new Date(currentDate);
      let bucketEnd: Date;
      let label: string;

      switch (interval) {
        case TimeInterval.DAY:
          bucketEnd = new Date(currentDate);
          bucketEnd.setDate(bucketEnd.getDate() + 1);
          bucketEnd.setMilliseconds(bucketEnd.getMilliseconds() - 1);
          label = this.formatDate(bucketStart, 'day');
          currentDate.setDate(currentDate.getDate() + 1);
          break;

        case TimeInterval.WEEK:
          const dayOfWeek = currentDate.getDay();
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          bucketStart.setDate(bucketStart.getDate() + diffToMonday);
          bucketEnd = new Date(bucketStart);
          bucketEnd.setDate(bucketEnd.getDate() + 7);
          bucketEnd.setMilliseconds(bucketEnd.getMilliseconds() - 1);
          label = this.formatDate(bucketStart, 'week');
          currentDate = new Date(bucketEnd);
          currentDate.setDate(currentDate.getDate() + 1);
          break;

        case TimeInterval.MONTH:
          bucketStart.setDate(1);
          bucketEnd = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          label = this.formatDate(bucketStart, 'month');
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }

      const bucketSubmissions = submissions.filter((sub) => {
        const subDate = new Date(sub.beganAt);
        return subDate >= bucketStart && subDate <= bucketEnd;
      });

      buckets.push({
        intervalStart: bucketStart,
        intervalEnd: bucketEnd,
        intervalLabel: label,
        submissions: bucketSubmissions,
      });

      if (bucketEnd >= end) break;
    }

    return buckets;
  }

  private formatDate(date: Date, interval: 'day' | 'week' | 'month'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (interval) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekEnd = new Date(date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
        const endDay = String(weekEnd.getDate()).padStart(2, '0');
        return `${year}-${month}-${day} to ${endMonth}-${endDay}`;
      case 'month':
        return `${year}-${month}`;
    }
  }

  private calculateIntervalPerformance(bucket: {
    intervalStart: Date;
    intervalEnd: Date;
    intervalLabel: string;
    submissions: any[];
  }): IntervalPerformance {
    const { intervalStart, intervalEnd, intervalLabel, submissions } = bucket;

    if (submissions.length === 0) {
      return {
        intervalStart,
        intervalEnd,
        intervalLabel,
        weightedMarksPercentage: 0,
        accuracyRatio: 0,
        totalSubmissions: 0,
        totalMarksAttempted: 0,
        totalMarksAwarded: 0,
        questionsFullyCorrect: 0,
        totalQuestions: 0,
      };
    }

    const difficultyWeights = {
      [DifficultyLevel.Easy]: 0.2,
      [DifficultyLevel.Medium]: 0.3,
      [DifficultyLevel.Hard]: 0.5,
    };

    const difficultyMetrics = new Map<
      DifficultyLevel,
      {
        marksAttempted: number;
        marksAwarded: number;
      }
    >();

    Object.values(DifficultyLevel).forEach((level) => {
      difficultyMetrics.set(level, {
        marksAttempted: 0,
        marksAwarded: 0,
      });
    });

    let totalMarksAttempted = 0;
    let totalMarksAwarded = 0;
    let questionsFullyCorrect = 0;
    let totalQuestions = submissions.length;

    submissions.forEach((submission) => {
      const difficulty = submission.question?.difficulty_level;
      const totalMarks = submission.question?.totalMarks || 0;
      const awardedMarks = submission.awardedMarks || 0;

      totalMarksAttempted += totalMarks;
      totalMarksAwarded += awardedMarks;

      if (totalMarks > 0 && awardedMarks === totalMarks) {
        questionsFullyCorrect++;
      }

      if (difficulty) {
        const metrics = difficultyMetrics.get(difficulty);
        if (metrics) {
          metrics.marksAttempted += totalMarks;
          metrics.marksAwarded += awardedMarks;
        }
      }
    });

    let weightedMarksPercentage = 0;
    let totalWeight = 0;

    difficultyMetrics.forEach((metrics, difficulty) => {
      if (metrics.marksAttempted > 0) {
        const percentage =
          (metrics.marksAwarded / metrics.marksAttempted) * 100;
        const weight = difficultyWeights[difficulty];
        weightedMarksPercentage += percentage * weight;
        totalWeight += weight;
      }
    });

    if (totalWeight > 0 && totalWeight < 1) {
      weightedMarksPercentage = weightedMarksPercentage / totalWeight;
    }

    const accuracyRatio =
      totalQuestions > 0 ? questionsFullyCorrect / totalQuestions : 0;

    return {
      intervalStart,
      intervalEnd,
      intervalLabel,
      weightedMarksPercentage: parseFloat(
        (weightedMarksPercentage / 100).toFixed(4),
      ),
      accuracyRatio: parseFloat(accuracyRatio.toFixed(4)),
      totalSubmissions: submissions.length,
      totalMarksAttempted,
      totalMarksAwarded,
      questionsFullyCorrect,
      totalQuestions,
    };
  }
}
