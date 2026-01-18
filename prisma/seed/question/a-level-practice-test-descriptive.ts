import { PrismaClient, DifficultyLevel, QuestionFor } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Run with: npx ts-node prisma/seed/question/a-level-practice-questions-descriptive.ts
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
  console.log('Seeding practice questions...');

  const practiceQusPath = path.join(
    __dirname,
    'Level-A-Math-Question-desc-descriptive-practice.json',
  );
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

  let createdCount = 0;
  let skippedCount = 0;
  let notFoundTopic = 0;
  let notFoundSubtopic = 0;
  const notFoundTopics: string[] = [];
  const notFoundSubtopics: { topic: string; subtopic: string }[] = [];

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
      const correctAnswer = removeComments(questionData.correct_answer || '');

      const topic = await prisma.topic.findFirst({
        where: {
          name: {
            equals: tutorialName,
            mode: 'insensitive',
          },
        },
        include: {
          module: true,
        },
      });

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

      const subtopic = await prisma.subtopic.findFirst({
        where: {
          topicId: topic.id,
          name: {
            equals: subtopicName,
            mode: 'insensitive',
          },
        },
      });

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

      const existingQuestion = await prisma.question.findFirst({
        where: {
          name: questionTitle,
          questionText: questionText,
          subtopicId: subtopic.id,
        },
      });

      if (existingQuestion) {
        console.log(
          `Skipping duplicate question: ${questionTitle} - ${existingQuestion.id}`,
        );
        skippedCount++;
        continue;
      }

      const newQuestion = await prisma.question.create({
        data: {
          name: questionTitle,
          questionText: questionText,
          questionContentLink: '',
          hint: hint,
          questionFor: QuestionFor.Test,
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
          solutionBases: {
            create: {
              solutionDescriptives: {
                create: {
                  isInputCanvases:
                    questionData.Canvas == 'Yes' || questionData.canvas == 'Yes'
                      ? true
                      : false,
                  descriptiveSolution: correctAnswer,
                  descriptiveSolutionImage: questionData.correct_answer_image
                    ? 'question-solution-images/' +
                      questionData.correct_answer_image
                    : '',
                },
              },
            },
          },
        },
      });
      console.log(
        `Created question with id: ${newQuestion.id} - ${questionTitle}`,
      );
      createdCount++;
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
