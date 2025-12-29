import {
  AgeLevelName,
  BoardName,
  DifficultyLevel,
  ExamType,
  PrismaClient,
  Question,
  QuestionFor,
  ReviewStatus,
  Subject,
} from '@prisma/client';

// Run with: npx ts-node prisma/seed/exam-test-data.ts
// or: npm run db:seed:exam-test (added in package.json)

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding exam test data (topic/subtopics/questions)...');

  // 1. Ensure Module exists
  const boardAgeLevel = await prisma.boardAgeLevel.upsert({
    where: {
      boardName_ageLevelName: {
        boardName: BoardName.AQA,
        ageLevelName: AgeLevelName.GCSE,
      },
    },
    update: {},
    create: {
      boardName: BoardName.AQA,
      ageLevelName: AgeLevelName.GCSE,
    },
  });

  const moduleRecord = await prisma.module.upsert({
    where: {
      name_subject_boardAgeLevelId: {
        name: 'Mathematics (Seeded)',
        subject: Subject.Mathematics,
        boardAgeLevelId: boardAgeLevel.id,
      },
    },
    update: {},
    create: {
      name: 'Mathematics (Seeded)',
      description: 'Seed module for exam test data',
      subject: Subject.Mathematics,
      boardAgeLevelId: boardAgeLevel.id,
    },
  });

  // 2. Ensure Question Type exists
  const descriptive = await prisma.questionType.upsert({
    where: { name: 'Descriptive' },
    update: {},
    create: {
      name: 'Descriptive',
      description: 'Descriptive or free-form answer question',
    },
  });

  // 3. Create Topic
  const topic = await prisma.topic.create({
    data: {
      name: 'Algebra (Seeded)',
      description: 'Seed topic for testing exam question sets',
      moduleId: moduleRecord.id,
      serialNumber: 1,
      paperNumber: 1,
    },
  });

  // 4. Create Subtopics
  const subtopics = await Promise.all([
    prisma.subtopic.create({
      data: {
        name: 'Linear Equations (Seeded)',
        serialNumber: 1,
        topicId: topic.id,
      },
    }),
    prisma.subtopic.create({
      data: {
        name: 'Quadratics (Seeded)',
        serialNumber: 2,
        topicId: topic.id,
      },
    }),
  ]);

  // 5. Define Questions
  const questionsToCreate = [
    // Linear Equations
    ...Array.from({ length: 3 }).map((_, i) => ({
      name: `Solve linear equation #${i + 1}`,
      questionText: `Solve for x: ${i + 2}x + 3 = ${2 * (i + 2)}.`,
      hint: 'Rearrange to isolate x.',
      totalMarks: 1,
      timeLimit: 1,
      difficulty_level: DifficultyLevel.Easy,
      stepCount: 1,
      serialNo: 100 + i + 1,
      questionTypeId: descriptive.id,
      questionFor: QuestionFor.Test,
      topicId: topic.id,
      subtopicId: subtopics[0].id,
    })),
    // Quadratics
    ...Array.from({ length: 3 }).map((_, i) => ({
      name: `Factorise quadratic #${i + 1}`,
      questionText: `Factorise: x^2 + ${i + 2}x + ${i + 1}.`,
      hint: 'Find two numbers that multiply to the constant term and add to the coefficient of x.',
      totalMarks: 1,
      timeLimit: 2,
      difficulty_level: DifficultyLevel.Medium,
      stepCount: 1,
      serialNo: 200 + i + 1,
      questionTypeId: descriptive.id,
      questionFor: QuestionFor.Test,
      topicId: topic.id,
      subtopicId: subtopics[1].id,
    })),
  ];

  // 6. Create Questions and Solutions
  const createdQuestions: Question[] = [];
  for (const q of questionsToCreate) {
    const question = await prisma.question.create({
      data: {
        name: q.name,
        questionText: q.questionText,
        questionContentLink: '',
        hint: q.hint,
        totalMarks: q.totalMarks,
        timeLimit: q.timeLimit,
        difficulty_level: q.difficulty_level,
        stepCount: q.stepCount,
        serialNo: q.serialNo,
        questionTypeId: q.questionTypeId,
        questionFor: q.questionFor,
        topicId: q.topicId,
        moduleId: moduleRecord.id,
        subtopicId: q.subtopicId,
        solutionBases: {
          create: {
            solutionDescriptives: {
              create: {
                descriptiveSolution: 'Seeded solution (replace later).',
              },
            },
          },
        },
      },
    });
    createdQuestions.push(question);
  }

  // 7. Create Test Exam
  const testExam = await prisma.exam.create({
    data: {
      name: 'Test Exam for API Verification',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000), // 1 hour from now
      type: ExamType.Normal,
      difficulty: DifficultyLevel.Easy,
      timeLimit: 60,
      maxNumberOfQuestions: createdQuestions.length,
      status: ReviewStatus.Scheduled,
      totalMarks: createdQuestions.reduce((sum, q) => sum + (q.totalMarks || 0), 0),
    },
  });

  // 8. Link Exam to Subtopics
  await prisma.examSubtopic.createMany({
    data: subtopics.map((s) => ({
      examId: testExam.id,
      topicId: topic.id,
      subtopicId: s.id,
    })),
  });

  // 9. Create QuestionSet for the Exam
  await prisma.questionSet.createMany({
    data: createdQuestions.map((q, idx) => ({
      examId: testExam.id,
      questionId: q.id,
      moduleId: moduleRecord.id,
      serialNo: idx + 1,
    })),
  });

  console.log('Seeded:');
  console.log(`- examId: ${testExam.id}`);
  console.log(`- topicId: ${topic.id}`);
  console.log(`- questions: ${createdQuestions.length}`);
  console.log(`- questionSet entries created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


