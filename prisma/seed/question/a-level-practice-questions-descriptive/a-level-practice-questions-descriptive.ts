import { PrismaClient, DifficultyLevel, QuestionFor } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Run with: npx ts-node prisma/seed/question/a-level-practice-questions-descriptive/a-level-practice-questions-descriptive.ts [fileNumber]
// Example: npx ts-node prisma/seed/question/a-level-practice-questions-descriptive/a-level-practice-questions-descriptive.ts 2
const prisma = new PrismaClient();

function removeComments(text: string): string {
  if (!text || text.trim() === '') return text;
  return text.trim();
  //return text.replace(/\/\//g, '');
}

function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}

async function main() {
  const fileNumber = process.argv[2];

  if (!fileNumber) {
    console.error('Error: Please provide a file number as argument');
    console.error(
      'Usage: npx ts-node prisma/seed/question/a-level-practice-practice-descriptive/a-level-practice-practice-descriptive.ts <file_number>',
    );
    console.error(
      'Example: npx ts-node prisma/seed/question/a-level-practice-practice-descriptive/a-level-practice-practice-descriptive.ts 1',
    );
    process.exit(1);
  }

  const fileName = `Level-A-Math-Question-desc-descriptive-practice-${fileNumber}.json`;

  console.log(`Seeding practice questions from ${fileName}...`);

  const practiceQusPath = path.join(__dirname, fileName);

  if (!fs.existsSync(practiceQusPath)) {
    console.error(`Error: File not found: ${practiceQusPath}`);
    process.exit(1);
  }

  const practiceQusFile = fs.readFileSync(practiceQusPath, 'utf-8');
  const practiceQusData = JSON.parse(practiceQusFile);

  const descriptiveQuestionType = await prisma.questionType.findUnique({
    where: { name: 'Descriptive' },
  });

  if (!descriptiveQuestionType) {
    console.error(
      '"Descriptive" question type not found. Please seed question types first.',
    );
    return;
  }

  const difficultyMap: { [key: string]: DifficultyLevel } = {
    Easy: DifficultyLevel.Easy,
    Medium: DifficultyLevel.Medium,
    Hard: DifficultyLevel.Hard,
  };

  console.log('Fetching all topics and subtopics...');
  const allTopics = await prisma.topic.findMany({
    include: {
      module: true,
      subtopics: true,
    },
  });

  const topicMap = new Map<string, (typeof allTopics)[0]>();
  const subtopicMap = new Map<string, (typeof allTopics)[0]['subtopics'][0]>();

  allTopics.forEach((topic) => {
    topicMap.set(topic.name.toLowerCase(), topic);
    topic.subtopics.forEach((subtopic) => {
      const key = `${topic.name.toLowerCase()}_${subtopic.name.toLowerCase()}`;
      subtopicMap.set(key, subtopic);
    });
  });

  console.log(
    `Loaded ${topicMap.size} topics and ${subtopicMap.size} subtopics into memory`,
  );

  console.log('Fetching existing questions from database...');
  const existingQuestions = await prisma.question.findMany({
    where: {
      questionFor: QuestionFor.Practice,
    },
    select: {
      name: true,
      questionText: true,
      subtopicId: true,
      questionFor: true,
    },
  });

  const existingQuestionsSet = new Set<string>();
  existingQuestions.forEach((q) => {
    const key = `${q.name}_${q.questionText}_${q.subtopicId}_${q.questionFor}`;
    existingQuestionsSet.add(key);
  });
  console.log(
    `Loaded ${existingQuestionsSet.size} existing questions from database`,
  );

  let createdCount = 0;
  let skippedCount = 0;
  let notFoundTopic = 0;
  let notFoundSubtopic = 0;
  const notFoundTopics: string[] = [];
  const notFoundSubtopics: { topic: string; subtopic: string }[] = [];

  const questionsToInsert: any[] = [];
  const solutionDataMap: Map<string, any> = new Map();

  for (const [topicKey, questions] of Object.entries(practiceQusData)) {
    console.log(`\nProcessing topic: ${topicKey}`);

    if (!Array.isArray(questions)) {
      console.warn(`Skipping ${topicKey} - not an array`);
      continue;
    }
    let serialNoCount = 0;
    for (const questionData of questions as any[]) {
      serialNoCount++;
      if (
        !questionData.tutorial_name ||
        !questionData.subtopic_name ||
        !questionData.question_title
      ) {
        console.warn(
          `Skipping question due to missing required fields - Tutorial: "${questionData.tutorial_name}", Subtopic: "${questionData.subtopic_name}", Title: "${questionData.question_title}"`,
        );
        skippedCount++;
        continue;
      }
      const tutorialName = removeComments(questionData.tutorial_name || '');
      const subtopicName = removeComments(questionData.subtopic_name || '');
      const questionTitle = removeComments(questionData.question_title || '');
      const questionText = removeComments(questionData.question_text || '');
      const hint = removeComments(questionData.hint || '');
      const serialNo = removeComments(
        questionData.seriel_no?.toString() || serialNoCount.toString(),
      );
      const correctAnswer = removeComments(questionData.solution_text || '');

      const topic = topicMap.get(tutorialName.toLowerCase());

      if (!topic) {
        console.error(
          `Topic "${tutorialName}" not found for question: ${questionTitle}`,
        );
        notFoundTopic++;
        if (!notFoundTopics.includes(tutorialName)) {
          notFoundTopics.push(tutorialName);
        }
        continue;
      }

      const subtopicKey = `${tutorialName.toLowerCase()}_${subtopicName.toLowerCase()}`;
      const subtopic = subtopicMap.get(subtopicKey);

      if (!subtopic) {
        console.error(
          `Subtopic "${subtopicName}" not found in topic "${tutorialName}" for question: ${questionTitle}`,
        );
        notFoundSubtopic++;
        const notFoundEntry = { topic: tutorialName, subtopic: subtopicName };
        if (
          !notFoundSubtopics.some(
            (item) =>
              item.topic === tutorialName && item.subtopic === subtopicName,
          )
        ) {
          notFoundSubtopics.push(notFoundEntry);
        }
        continue;
      }

      const questionKey = `${questionTitle}_${questionText}_${subtopic.id}_${QuestionFor.Practice}`;
      if (existingQuestionsSet.has(questionKey)) {
        console.log(`Skipping duplicate question: ${questionTitle}`);
        skippedCount++;
        continue;
      }
      existingQuestionsSet.add(questionKey);

      questionsToInsert.push({
        name: questionTitle,
        questionText: questionText,
        questionContentLink: '',
        hint: hint,
        questionFor: QuestionFor.Practice,
        totalMarks: questionData.total_marks || 1,
        timeLimit: questionData.time_limit_in_min || 1,
        imageFileName: questionData.question_image
          ? 'question-images/' + questionData.question_image
          : '',
        difficultyLevel:
          difficultyMap[questionData.question_difficulty] ||
          DifficultyLevel.Easy,
        stepCount: 1,
        serialNo: serialNo,
        questionTypeId: descriptiveQuestionType.id,
        moduleId: topic.module.id,
        topicId: topic.id,
        subtopicId: subtopic.id,
      });

      const solutionKey = `${questionTitle}_${subtopic.id}`;
      solutionDataMap.set(solutionKey, {
        isInputCanvases:
          questionData.on_canvas?.toLowerCase() == 'yes' ? true : false,
        descriptiveSolution: correctAnswer,
        descriptiveSolutionImage: questionData.correct_answer_image
          ? 'question-solution-images/' + questionData.correct_answer_image
          : '',
      });
    }
  }

  console.log(`\nInserting ${questionsToInsert.length} questions in batch...`);

  if (questionsToInsert.length > 0) {
    const BATCH_SIZE = 500;

    for (let i = 0; i < questionsToInsert.length; i += BATCH_SIZE) {
      const batch = questionsToInsert.slice(i, i + BATCH_SIZE);

      const result = await prisma.question.createMany({
        data: batch,
        skipDuplicates: true,
      });

      createdCount += result.count;
      console.log(
        `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.count} questions (${Math.min(i + BATCH_SIZE, questionsToInsert.length)}/${questionsToInsert.length})`,
      );
    }

    console.log('\nInserting solution bases and descriptives...');

    const insertedQuestions = await prisma.question.findMany({
      where: {
        OR: questionsToInsert.map((q) => ({
          name: q.name,
          subtopicId: q.subtopicId,
        })),
      },
      select: {
        id: true,
        name: true,
        subtopicId: true,
      },
    });

    const solutionBasesToInsert = insertedQuestions.map((q) => ({
      questionId: q.id,
    }));

    if (solutionBasesToInsert.length > 0) {
      await prisma.solutionBase.createMany({
        data: solutionBasesToInsert,
        skipDuplicates: true,
      });

      const insertedSolutionBases = await prisma.solutionBase.findMany({
        where: {
          questionId: {
            in: insertedQuestions.map((q) => q.id),
          },
        },
        select: {
          id: true,
          questionId: true,
          question: {
            select: {
              name: true,
              subtopicId: true,
            },
          },
        },
      });

      const solutionDescriptivesToInsert = insertedSolutionBases.map((sb) => {
        const solutionData = solutionDataMap.get(
          `${sb.question.name}_${sb.question.subtopicId}`,
        );
        return {
          solutionBaseId: sb.id,
          isInputCanvases: solutionData?.isInputCanvases || false,
          descriptiveSolution: solutionData?.descriptiveSolution || '',
          descriptiveSolutionImage:
            solutionData?.descriptiveSolutionImage || '',
        };
      });

      if (solutionDescriptivesToInsert.length > 0) {
        await prisma.solutionDescriptive.createMany({
          data: solutionDescriptivesToInsert,
          skipDuplicates: true,
        });
        console.log(
          `Inserted ${solutionDescriptivesToInsert.length} solution descriptives`,
        );
      }
    }
  }

  console.log('\n=== Seeding Summary ===');
  console.log(`Created: ${createdCount} questions`);
  console.log(`Skipped: ${skippedCount} duplicate questions`);
  console.log(`Not found topic: ${notFoundTopic} questions`);
  console.log(`Not found subtopic: ${notFoundSubtopic} questions`);

  if (notFoundTopics.length > 0) {
    console.log('\n=== Topics Not Found ===');
    notFoundTopics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic}`);
    });
  }

  if (notFoundSubtopics.length > 0) {
    console.log('\n=== Subtopics Not Found ===');
    notFoundSubtopics.forEach((item, index) => {
      console.log(
        `${index + 1}. Topic: "${item.topic}" - Subtopic: "${item.subtopic}"`,
      );
    });
  }

  console.log('\nFinished seeding practice questions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
