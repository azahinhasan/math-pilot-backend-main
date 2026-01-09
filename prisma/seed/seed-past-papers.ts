import {
  PrismaClient,
  Subject,
  AgeLevelName,
  ContentBy,
  QuestionFor,
  DifficultyLevel,
} from '@prisma/client';

const prisma = new PrismaClient();

async function seedPastPapers() {
  console.log('🚀 Seeding Past Papers with Full Context...');

  // 1. Find or Create Module and Board Context
  let module = await prisma.module.findFirst({
    where: {
      name: 'Mathematics',
      subject: Subject.Mathematics,
      boardAgeLevel: {
        ageLevelName: AgeLevelName.GCSE,
      },
    },
    include: {
      boardAgeLevel: true,
    },
  });

  if (!module) {
    console.log(
      '⚠️ Mathematics GCSE Module not found. Attempting to find ANY module...',
    );
    module = await prisma.module.findFirst({
      include: { boardAgeLevel: true },
    });

    if (!module) {
      throw new Error(
        '❌ No modules found in DB. Please run basic seeds first.',
      );
    }
  }

  const moduleId = module.id;
  const boardId = module.boardAgeLevelId;
  const boardName = module.boardAgeLevel.boardName;

  console.log(
    `Using Context - Board: ${boardName} (${boardId}), Module: ${module.name} (${moduleId})`,
  );

  // 2. Ensure Topic/Subtopic exists
  let topic = await prisma.topic.findFirst({ where: { moduleId } });
  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        name: 'General Mathematics',
        moduleId,
        serialNumber: 1,
        paperNumber: 1,
      },
    });
  }

  let subtopic = await prisma.subtopic.findFirst({
    where: { topicId: topic.id },
  });
  if (!subtopic) {
    subtopic = await prisma.subtopic.create({
      data: {
        name: 'Pure Mathematics',
        topicId: topic.id,
        serialNumber: 1,
      },
    });
  }

  // 3. Ensure Question Types exist
  let mcqType = await prisma.questionType.findUnique({
    where: { name: 'MCQ' },
  });
  if (!mcqType) {
    mcqType = await prisma.questionType.create({
      data: { name: 'MCQ', description: 'Multiple Choice' },
    });
  }

  let descType = await prisma.questionType.findUnique({
    where: { name: 'Descriptive' },
  });
  if (!descType) {
    descType = await prisma.questionType.create({
      data: { name: 'Descriptive', description: 'Descriptive' },
    });
  }

  // 4. Create Past Papers
  const pastPapersData = [
    {
      name: 'May/June 2023 Paper 1',
      year: 2023,
      season: 'Summer',
      timeLimit: 90,
      markSchemeUrl: 'https://example.com/ms-2023-p1.pdf',
    },
    {
      name: 'Oct/Nov 2022 Paper 2',
      year: 2022,
      season: 'Winter',
      timeLimit: 120,
      markSchemeUrl: 'https://example.com/ms-2022-p2.pdf',
    },
  ];

  for (const ppData of pastPapersData) {
    // Upsert Past Paper
    let pastPaper = await prisma.pastPaper.findFirst({
      where: {
        name: ppData.name,
        moduleId,
        boardId,
      },
    });

    if (!pastPaper) {
      pastPaper = await prisma.pastPaper.create({
        data: {
          ...ppData,
          moduleId,
          boardId,
        },
      });
      console.log(`✅ Created Past Paper: ${pastPaper.name}`);
    } else {
      console.log(`ℹ️ Past Paper ${pastPaper.name} already exists.`);
    }

    // 5. Create and Link Questions (if not already linked)
    const existingCount = await prisma.questionSet.count({
      where: { pastPaperId: pastPaper.id },
    });

    if (existingCount === 0) {
      console.log(`   Creating 5 sample questions for ${pastPaper.name}...`);

      for (let i = 1; i <= 5; i++) {
        const isMcq = i % 2 !== 0; // Odd = MCQ, Even = Descriptive
        const typeId = isMcq ? mcqType.id : descType.id;

        // Create Question
        const question = await prisma.question.create({
          data: {
            name: `Question ${i} (${ppData.year})`,
            questionText: isMcq
              ? `Solve for x: ${i}x + 2 = ${i * 4}`
              : `Explain the process of solving linear equations like ${i}x = 10.`,
            moduleId,
            topicId: topic.id,
            subtopicId: subtopic.id,
            questionTypeId: typeId,
            totalMarks: isMcq ? 1 : 4,
            timeLimit: isMcq ? 2 : 10,
            stepCount: 1,
            serialNo: i,
            contentBy: ContentBy.AI,
            questionFor: QuestionFor.Practice,
            difficultyLevel: DifficultyLevel.Medium,
          },
        });

        // Create SolutionBase
        const solutionBase = await prisma.solutionBase.create({
          data: {
            questionId: question.id,
          },
        });

        // Create Specific Solution
        if (isMcq) {
          // Create Options
          await prisma.solutionMcq.createMany({
            data: [
              {
                solutionBaseId: solutionBase.id,
                optionText: '2',
                isCorrect: false,
              },
              {
                solutionBaseId: solutionBase.id,
                optionText: '4',
                isCorrect: false,
              },
              {
                solutionBaseId: solutionBase.id,
                optionText: `${(i * 4 - 2) / i}`,
                isCorrect: true,
                mark: 1,
              },
              {
                solutionBaseId: solutionBase.id,
                optionText: '10',
                isCorrect: false,
              },
            ],
          });
        } else {
          await prisma.solutionDescriptive.create({
            data: {
              solutionBaseId: solutionBase.id,
              descriptiveSolution:
                'Isolate the variable by performing inverse operations.',
              maxMarks: 4,
            },
          });
        }

        // Link to Past Paper
        await prisma.questionSet.create({
          data: {
            pastPaperId: pastPaper.id,
            questionId: question.id,
            moduleId,
            serialNo: i,
          },
        });
      }
      console.log(`   ✅ Created and linked 5 questions.`);
    } else {
      console.log(`   ℹ️ Questions already linked.`);
    }
  }
}

if (require.main === module) {
  seedPastPapers()
    .catch((e) => {
      console.error('❌ Error seeding past papers:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
