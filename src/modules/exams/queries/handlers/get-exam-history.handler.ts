import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExamHistoryQuery } from '../get-exam-history.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SubmissionType } from '@prisma/client';
import { ExamHistorySortBy } from '../../dto/get-exam-history.dto';

/**
 * Result structure for each exam history entry.
 * Represents an aggregated view of a single exam attempt (which consists of multiple question submissions).
 */
export interface ExamHistoryEntry {
  examId: string;
  examName: string;
  topicNames: string[];
  subtopicNames: string[];
  progress: number;      // Count of correct answers across all questions in this exam
  accuracy: number;      // Percentage of correct answers (0-100)
  timeSpent: number;     // Total duration of the attempt in seconds
  mistakes: number;      // Count of incorrect answers
  totalMarks: number;    // Sum of awarded marks across all questions
  maxMarks: number;      // Maximum possible marks defined for the exam
  attemptedAt: Date;     // Timestamp indicating when the attempt began
}

/**
 * Handler for the GetExamHistoryQuery.
 * Aggregates question-level 'Exam' submissions from the database into a list of completed test attempts.
 * Handles grouping, calculation of metrics, filtering, sorting, and pagination.
 */
@QueryHandler(GetExamHistoryQuery)
export class GetExamHistoryHandler implements IQueryHandler<GetExamHistoryQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetExamHistoryQuery) {
    const { studentId, queryDto } = query;
    const { topic, subtopic, sortBy, page, limit } = queryDto;

    // 1. Fetch all submissions for the student related to exams
    // We include questions, topics, subtopics to gather data
    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId,
        type: SubmissionType.Exam,
        examId: { not: null },
        // Optional filters for topic/subtopic names
        ...(topic || subtopic ? {
          question: {
            topic: topic ? { name: { contains: topic, mode: 'insensitive' } } : undefined,
            subtopic: subtopic ? { name: { contains: subtopic, mode: 'insensitive' } } : undefined,
          }
        } : {}),
      },
      include: {
        question: {
          include: {
            topic: true,
            subtopic: true,
          }
        }
      },
      orderBy: {
        beganAt: 'desc',
      },
    });

    // 2. Group submissions by examId in memory
    const examGroups = new Map<string, any[]>();
    submissions.forEach((submission) => {
      const examId = submission.examId!;
      if (!examGroups.has(examId)) {
        examGroups.set(examId, []);
      }
      examGroups.get(examId)!.push(submission);
    });

    // Fetch exam details separately since the relation might be missing in some environments
    const examIds = Array.from(examGroups.keys());
    const exams = await this.prisma.exam.findMany({
      where: { id: { in: examIds } },
    });
    const examMap = new Map(exams.map((e) => [e.id, e]));

    // 3. Process each group to calculate the required metrics
    const historyEntries: ExamHistoryEntry[] = Array.from(examGroups.entries()).map(([examId, group]) => {
      const examInfo = examMap.get(examId);
      
      // Collect unique topic and subtopic names across all questions in this exam attempt
      const topicNames = [...new Set(group.map(s => s.question.topic.name))];
      const subtopicNames = [...new Set(group.map(s => s.question.subtopic.name))];
      
      // Calculate correctness metrics
      const correctAnswers = group.reduce((sum, s) => sum + (s.correctAnswersCount || 0), 0);
      const totalQuestions = group.length;
      
      // Calculate marks obtained
      const totalMarksObtained = group.reduce((sum, s) => sum + (s.awardedMarks || 0), 0);
      
      // Calculate time spent (sum of durations of each question submission)
      const totalTimeSpentSeconds = group.reduce((sum, s) => {
        if (s.beganAt && s.endedAt) {
          return sum + Math.floor((s.endedAt.getTime() - s.beganAt.getTime()) / 1000);
        }
        return sum;
      }, 0);

      return {
        examId,
        examName: examInfo?.name || 'Unknown Exam',
        topicNames,
        subtopicNames,
        progress: correctAnswers,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        timeSpent: totalTimeSpentSeconds,
        mistakes: totalQuestions - correctAnswers,
        totalMarks: totalMarksObtained,
        maxMarks: examInfo?.totalMarks || 0,
        attemptedAt: group[0].beganAt, // Using the first question's start time as the attempt timestamp
      };
    });

    // 4. Apply sorting
    if (sortBy === ExamHistorySortBy.MARKS) {
      historyEntries.sort((a, b) => b.totalMarks - a.totalMarks);
    } else {
      // Default: recent attempts first
      historyEntries.sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime());
    }

    // 5. Apply pagination
    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const totalCount = historyEntries.length;
    const paginatedEntries = historyEntries.slice((currentPage - 1) * currentLimit, currentPage * currentLimit);

    return {
      entries: paginatedEntries,
      meta: {
        total: totalCount,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(totalCount / currentLimit),
      }
    };
  }
}

