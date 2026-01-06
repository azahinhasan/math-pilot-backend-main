import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubjectsProgressQuery } from '../get-subjects-progress.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Subject } from '@prisma/client';

export interface SubjectProgress {
  subject: Subject;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
}

@QueryHandler(GetSubjectsProgressQuery)
export class GetSubjectsProgressHandler implements IQueryHandler<GetSubjectsProgressQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetSubjectsProgressQuery): Promise<SubjectProgress[]> {
    const { studentId } = query;

    // 1. Fetch all modules grouped by subject with their topics and question counts
    const modules = await this.prisma.module.findMany({
      where: {
        voided: false,
      },
      include: {
        topics: {
          where: { voided: false },
          include: {
            _count: {
              select: { questions: { where: { voided: false } } },
            },
          },
        },
      },
    });

    // 2. Fetch student's topic details
    const studentTopicDetails = await this.prisma.studentTopicDetails.findMany({
      where: {
        studentId,
      },
    });

    // Create a map for quick lookup of student progress
    const progressMap = new Map<string, (typeof studentTopicDetails)[0]>();
    studentTopicDetails.forEach((detail) => {
      progressMap.set(detail.topicId, detail);
    });

    // 3. Aggregate data by Subject
    const subjectMap = new Map<Subject, SubjectProgress>();

    // Initialize map for all found subjects
    modules.forEach((mod) => {
      if (!subjectMap.has(mod.subject)) {
        subjectMap.set(mod.subject, {
          subject: mod.subject,
          totalTopics: 0,
          completedTopics: 0,
          inProgressTopics: 0,
        });
      }

      const stats = subjectMap.get(mod.subject)!;

      mod.topics.forEach((topic) => {
        stats.totalTopics++;

        const totalQuestions = topic._count.questions;
        const progress = progressMap.get(topic.id);

        if (progress) {
          const questionsCorrect = progress.questionsCorrect || 0;
          const questionsAttempted = progress.questionsAttempted || 0;

          // Check completed
          // Only consider completed if there are questions to complete
          const isCompleted =
            totalQuestions > 0 && questionsCorrect >= totalQuestions;

          if (isCompleted) {
            stats.completedTopics++;
          } else if (questionsAttempted > 0) {
            // If not completed, but attempted, count as in progress
            stats.inProgressTopics++;
          }
        }
      });
    });

    return Array.from(subjectMap.values());
  }
}
