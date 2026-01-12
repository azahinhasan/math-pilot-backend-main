import {
  PrismaClient,
  ExamType,
  DifficultyLevel,
  ContentBy,
  QuestionFor,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Competitive Exam...');

  // 1. Find Module (Pure Mathematics 1 or fallback to Mathematics)
  let moduleName = 'Pure Mathematics 1';
  let module = await prisma.module.findFirst({
    where: { name: moduleName },
  });

  if (!module) {
    // Fallback to 'Mathematics' if Pure Math 1 doesn't exist
    moduleName = 'Mathematics';
    module = await prisma.module.findFirst({
      where: { name: moduleName },
    });
  }

  if (!module) {
    throw new Error(
      `Module Pure Mathematics 1 or Mathematics not found. Please run basic seeds first.`,
    );
  }

  console.log(`Using Module: ${module.name}`);

  // 2. Find or Create Topic and Subtopic
  const topicName = 'Chapter 2 - Quadratics';
  const subtopicName = 'Quadratic graphs';

  let topic = await prisma.topic.findFirst({
    where: { name: topicName, moduleId: module.id },
  });

  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        name: topicName,
        moduleId: module.id,
        serialNumber: 2,
        paperNumber: 1,
      },
    });
    console.log(`Created Topic: ${topicName}`);
  }

  let subtopic = await prisma.subtopic.findFirst({
    where: { name: subtopicName, topicId: topic.id },
  });

  if (!subtopic) {
    subtopic = await prisma.subtopic.create({
      data: {
        name: subtopicName,
        topicId: topic.id,
        serialNumber: 1,
      },
    });
    console.log(`Created Subtopic: ${subtopicName}`);
  }

  // 3. Get Question Types
  const qtMCQ = await prisma.questionType.findUnique({
    where: { name: 'MCQ' },
  });
  const qtTrueFalse = await prisma.questionType.findUnique({
    where: { name: 'TrueFalse' },
  });
  const qtDescriptive = await prisma.questionType.findUnique({
    where: { name: 'Descriptive' },
  });

  if (!qtMCQ || !qtDescriptive) {
    throw new Error(
      'Required Question Types (MCQ, Descriptive) not found. Run add-question-types seed.',
    );
  }

  // 4. Create Exam
  const exam = await prisma.exam.create({
    data: {
      name: 'Competitive Exam - Beginner Level',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600 * 1000), // 1 hour later
      type: ExamType.Competitive,
      difficulty: DifficultyLevel.Easy, // Beginner
      totalMarks: 40,
      timeLimit: 60,
    },
  });
  console.log(`Created Exam: ${exam.name} (${exam.id})`);

  // 5. Create Questions
  // 2 of each type: "Descriptive", "ShortAnswer", "MCQ", "Boolean"

  const questionsData = [
    // 2 MCQs
    {
      type: 'MCQ',
      text: 'Which of the following is the standard form of a quadratic equation?',
      options: [
        { text: 'ax^2 + bx + c = 0', correct: true },
        { text: 'y = mx + c', correct: false },
        { text: 'a^2 + b^2 = c^2', correct: false },
        { text: 'E = mc^2', correct: false },
      ],
      qTypeId: qtMCQ.id,
    },
    {
      type: 'MCQ',
      text: 'The graph of a quadratic function is called a:',
      options: [
        { text: 'Parabola', correct: true },
        { text: 'Circle', correct: false },
        { text: 'Ellipse', correct: false },
        { text: 'Straight Line', correct: false },
      ],
      qTypeId: qtMCQ.id,
    },
    // 2 Booleans
    {
      type: 'Boolean',
      text: 'A quadratic equation always has two real roots.',
      options: [
        { text: 'True', correct: false },
        { text: 'False', correct: true },
      ],
      qTypeId: qtTrueFalse?.id || qtMCQ.id,
    },
    {
      type: 'Boolean',
      text: 'The vertex is the turning point of a parabola.',
      options: [
        { text: 'True', correct: true },
        { text: 'False', correct: false },
      ],
      qTypeId: qtTrueFalse?.id || qtMCQ.id,
    },
    // 2 Short Answers (Descriptive, isInputCanvases = false)
    {
      type: 'ShortAnswer',
      text: 'What is the value of the discriminant for the equation x^2 + 2x + 1 = 0?',
      solution: '0',
      maxMarks: 5,
      qTypeId: qtDescriptive.id,
    },
    {
      type: 'ShortAnswer',
      text: 'Write the coordinates of the vertex for y = x^2.',
      solution: '(0,0)',
      maxMarks: 5,
      qTypeId: qtDescriptive.id,
    },
    // 2 Descriptive (Descriptive, isInputCanvases = true)
    {
      type: 'Descriptive',
      text: 'Sketch the graph of y = x^2 - 4x. Show the x-intercepts and the vertex.',
      solution:
        'Parabola opening upwards. Intercepts at (0,0) and (4,0). Vertex at (2, -4).',
      maxMarks: 10,
      qTypeId: qtDescriptive.id,
    },
    {
      type: 'Descriptive',
      text: 'Explain how the value of the discriminant determines the nature of the roots of a quadratic equation.',
      solution:
        'If D > 0, two distinct real roots. If D = 0, one real repeated root. If D < 0, no real roots (two complex roots).',
      maxMarks: 10,
      qTypeId: qtDescriptive.id,
    },
  ];

  let serialNo = 1;

  for (const qData of questionsData) {
    // Create Question
    const question = await prisma.question.create({
      data: {
        name: `Q${serialNo} - ${qData.type}`,
        questionText: qData.text,
        questionTypeId: qData.qTypeId,
        topicId: topic.id,
        subtopicId: subtopic.id,
        moduleId: module.id,
        difficultyLevel: DifficultyLevel.Easy,
        contentBy: ContentBy.AI,
        questionFor: QuestionFor.Practice,
        serialNo: serialNo,
        stepCount: 1,
        totalMarks: (qData as any).maxMarks || 1, // Default to 1 if not specified
      },
    });

    // Create SolutionBase
    const solutionBase = await prisma.solutionBase.create({
      data: {
        questionId: question.id,
      },
    });

    if (qData.type === 'MCQ' || qData.type === 'Boolean') {
      const options = (qData as any).options;
      for (const opt of options) {
        await prisma.solutionMcq.create({
          data: {
            solutionBaseId: solutionBase.id,
            optionText: opt.text,
            isCorrect: opt.correct,
            mark: opt.correct ? 1 : 0,
          },
        });
      }
    } else if (qData.type === 'ShortAnswer' || qData.type === 'Descriptive') {
      const isInputCanvases = qData.type === 'Descriptive';
      await prisma.solutionDescriptive.create({
        data: {
          solutionBaseId: solutionBase.id,
          descriptiveSolution: (qData as any).solution,
          isInputCanvases: isInputCanvases,
          maxMarks: (qData as any).maxMarks,
        },
      });
    }

    // Link to Exam via QuestionSet
    await prisma.questionSet.create({
      data: {
        examId: exam.id,
        questionId: question.id,
        moduleId: module.id,
        serialNo: serialNo,
      },
    });

    console.log(`Created ${qData.type} Question: ${qData.text}`);
    serialNo++;
  }

  console.log('Seeding Completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
