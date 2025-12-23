import {
  PrismaClient,
  ExamType,
  DifficultyLevel,
  ReviewStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

export async function seedExams() {
  console.log('📝 Starting exam data seeding...');

  // Get required data
  const modules = await prisma.module.findMany({
    where: {
      name: { in: ['Algebra', 'Geometry', 'Number'] },
    },
    include: {
      topics: {
        include: {
          subtopics: true,
        },
      },
    },
  });

  if (modules.length === 0) {
    console.log('⚠️  No modules found. Please run performance-data seeding first.');
    return { exams: [] };
  }

  const algebraModule = modules.find((m) => m.name === 'Algebra');
  const geometryModule = modules.find((m) => m.name === 'Geometry');
  const numberModule = modules.find((m) => m.name === 'Number');

  // Delete existing test exams
  console.log('🧹 Cleaning up existing exam data...');
  await prisma.examLog.deleteMany({
    where: {
      exam: {
        name: {
          in: [
            'Algebra Midterm Exam',
            'Geometry Assessment',
            'Number Theory Quiz',
            'Combined Mathematics Mock Exam',
            'Algebra Final Exam',
          ],
        },
      },
    },
  });

  await prisma.examSubtopic.deleteMany({
    where: {
      exam: {
        name: {
          in: [
            'Algebra Midterm Exam',
            'Geometry Assessment',
            'Number Theory Quiz',
            'Combined Mathematics Mock Exam',
            'Algebra Final Exam',
          ],
        },
      },
    },
  });

  await prisma.questionSet.deleteMany({
    where: {
      exam: {
        name: {
          in: [
            'Algebra Midterm Exam',
            'Geometry Assessment',
            'Number Theory Quiz',
            'Combined Mathematics Mock Exam',
            'Algebra Final Exam',
          ],
        },
      },
    },
  });

  await prisma.exam.deleteMany({
    where: {
      name: {
        in: [
          'Algebra Midterm Exam',
          'Geometry Assessment',
          'Number Theory Quiz',
          'Combined Mathematics Mock Exam',
          'Algebra Final Exam',
        ],
      },
    },
  });

  console.log('✓ Cleanup complete');

  // Create exams
  const exams: any[] = [];

  // Exam 1: Algebra Midterm Exam (2 weeks ago)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const algebraExam = await prisma.exam.create({
    data: {
      name: 'Algebra Midterm Exam',
      startTime: new Date(twoWeeksAgo.getTime()),
      endTime: new Date(twoWeeksAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours
      type: ExamType.Normal,
      difficulty: DifficultyLevel.Medium,
      timeLimit: 120, // minutes
      maxNumberOfQuestions: 25,
      totalMarks: 100,
      status: ReviewStatus.Graded,
    },
  });
  exams.push(algebraExam);
  console.log(`✓ Created exam: ${algebraExam.name} (ID: ${algebraExam.id})`);

  // Link algebra exam to subtopics
  if (algebraModule && algebraModule.topics.length > 0) {
    for (const topic of algebraModule.topics) {
      for (const subtopic of topic.subtopics) {
        await prisma.examSubtopic.create({
          data: {
            examId: algebraExam.id,
            topicId: topic.id,
            subtopicId: subtopic.id,
          },
        });
      }
    }
  }

  // Exam 2: Geometry Assessment (1 week ago)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const geometryExam = await prisma.exam.create({
    data: {
      name: 'Geometry Assessment',
      startTime: new Date(oneWeekAgo.getTime()),
      endTime: new Date(oneWeekAgo.getTime() + 1.5 * 60 * 60 * 1000), // 1.5 hours
      type: ExamType.Normal,
      difficulty: DifficultyLevel.Medium,
      timeLimit: 90, // minutes
      maxNumberOfQuestions: 15,
      totalMarks: 75,
      status: ReviewStatus.Graded,
    },
  });
  exams.push(geometryExam);
  console.log(`✓ Created exam: ${geometryExam.name} (ID: ${geometryExam.id})`);

  // Link geometry exam to subtopics
  if (geometryModule && geometryModule.topics.length > 0) {
    for (const topic of geometryModule.topics) {
      for (const subtopic of topic.subtopics) {
        await prisma.examSubtopic.create({
          data: {
            examId: geometryExam.id,
            topicId: topic.id,
            subtopicId: subtopic.id,
          },
        });
      }
    }
  }

  // Exam 3: Number Theory Quiz (3 days ago)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const numberExam = await prisma.exam.create({
    data: {
      name: 'Number Theory Quiz',
      startTime: new Date(threeDaysAgo.getTime()),
      endTime: new Date(threeDaysAgo.getTime() + 45 * 60 * 1000), // 45 minutes
      type: ExamType.Normal,
      difficulty: DifficultyLevel.Easy,
      timeLimit: 45, // minutes
      maxNumberOfQuestions: 10,
      totalMarks: 40,
      status: ReviewStatus.Graded,
    },
  });
  exams.push(numberExam);
  console.log(`✓ Created exam: ${numberExam.name} (ID: ${numberExam.id})`);

  // Link number exam to subtopics
  if (numberModule && numberModule.topics.length > 0) {
    for (const topic of numberModule.topics) {
      for (const subtopic of topic.subtopics) {
        await prisma.examSubtopic.create({
          data: {
            examId: numberExam.id,
            topicId: topic.id,
            subtopicId: subtopic.id,
          },
        });
      }
    }
  }

  // Exam 4: Combined Mathematics Mock Exam (1 month ago)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const mockExam = await prisma.exam.create({
    data: {
      name: 'Combined Mathematics Mock Exam',
      startTime: new Date(oneMonthAgo.getTime()),
      endTime: new Date(oneMonthAgo.getTime() + 3 * 60 * 60 * 1000), // 3 hours
      type: ExamType.Mock,
      difficulty: DifficultyLevel.Hard,
      timeLimit: 180, // minutes
      maxNumberOfQuestions: 40,
      totalMarks: 200,
      status: ReviewStatus.Graded,
    },
  });
  exams.push(mockExam);
  console.log(`✓ Created exam: ${mockExam.name} (ID: ${mockExam.id})`);

  // Link mock exam to all subtopics
  for (const module of modules) {
    for (const topic of module.topics) {
      for (const subtopic of topic.subtopics) {
        await prisma.examSubtopic.create({
          data: {
            examId: mockExam.id,
            topicId: topic.id,
            subtopicId: subtopic.id,
          },
        });
      }
    }
  }

  // Exam 5: Algebra Final Exam (6 weeks ago)
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
  const finalExam = await prisma.exam.create({
    data: {
      name: 'Algebra Final Exam',
      startTime: new Date(sixWeeksAgo.getTime()),
      endTime: new Date(sixWeeksAgo.getTime() + 2.5 * 60 * 60 * 1000), // 2.5 hours
      type: ExamType.Competitive,
      difficulty: DifficultyLevel.Hard,
      timeLimit: 150, // minutes
      maxNumberOfQuestions: 30,
      totalMarks: 150,
      status: ReviewStatus.Graded,
    },
  });
  exams.push(finalExam);
  console.log(`✓ Created exam: ${finalExam.name} (ID: ${finalExam.id})`);

  // Link final exam to algebra subtopics
  if (algebraModule && algebraModule.topics.length > 0) {
    for (const topic of algebraModule.topics) {
      for (const subtopic of topic.subtopics) {
        await prisma.examSubtopic.create({
          data: {
            examId: finalExam.id,
            topicId: topic.id,
            subtopicId: subtopic.id,
          },
        });
      }
    }
  }

  console.log(`✅ Successfully created ${exams.length} exams`);
  console.log('\nExam Summary:');
  exams.forEach((exam) => {
    console.log(`  - ${exam.name} (Type: ${exam.type}, ${exam.maxNumberOfQuestions} questions, ${exam.totalMarks} marks)`);
  });

  return { exams };
}

export default seedExams;

// Allow running this file directly
if (require.main === module) {
  seedExams()
    .catch((e) => {
      console.error('❌ Error seeding exams:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

