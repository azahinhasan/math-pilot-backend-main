import {
  AgeLevelName,
  BoardName,
  DifficultyLevel,
  PrismaClient,
  QuestionFor,
  Subject,
} from '@prisma/client';

// Run with: npx ts-node prisma/seed/exam-test-data.ts
// or: npm run db:seed:exam-test (added in package.json)

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding exam test data (topic/subtopics/questions)...');

  // Topic requires a module; reuse an existing module if possible, otherwise create a minimal one.
  const existingModule = await prisma.module.findFirst({
    where: { voided: false },
    select: { id: true },
  });

  const moduleRecord =
    existingModule ??
    (await (async () => {
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
        select: { id: true },
      });

      return prisma.module.upsert({
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
        select: { id: true },
      });
    })());

  // Ensure a question type exists to attach to questions
  const descriptive = await prisma.questionType.upsert({
    where: { name: 'Descriptive' },
    update: {},
    create: {
      name: 'Descriptive',
      description: 'Descriptive or free-form answer question',
    },
  });

  const topic = await prisma.topic.create({
    data: {
      name: 'Algebra (Seeded)',
      description: 'Seed topic for testing exam question sets',
      moduleId: moduleRecord.id,
      serialNumber: 1,
      paperNumber: 1,
    },
  });

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

  const questionsToCreate = [
    // Linear Equations
    ...Array.from({ length: 6 }).map((_, i) => ({
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
    ...Array.from({ length: 6 }).map((_, i) => ({
      name: `Factorise quadratic #${i + 1}`,
      questionText: `Factorise: x^2 + ${(i + 2)}x + ${i + 1}.`,
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

  // Create questions + minimal solutions so the DB is consistent with existing patterns
  for (const q of questionsToCreate) {
    await prisma.question.create({
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
  }

  console.log('Seeded:');
  console.log(`- topicId: ${topic.id}`);
  console.log(`- subtopicIds: ${subtopics.map((s) => s.id).join(', ')}`);
  console.log(`- questions: ${questionsToCreate.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


