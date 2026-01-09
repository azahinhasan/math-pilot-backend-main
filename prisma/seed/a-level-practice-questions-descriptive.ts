import { PrismaClient, DifficultyLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Run with: npx ts-node prisma/seed/a-level-practice-questions-descriptive.ts
const prisma = new PrismaClient();

function removeComments(text: string): string {
  if (!text) return text;
  return text;
  //return text.replace(/\/\//g, '');
}

function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}

async function main() {
  console.log('Seeding practice questions...');

  const practiceQusPath = path.join(
    __dirname,
    'json',
    'dummy',
    'Level-A-Math-Question-desc.json',
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

  let serialNo = 1;
  let createdCount = 0;
  let skippedCount = 0;

  for (const [topicKey, questions] of Object.entries(practiceQusData)) {
    console.log(`\nProcessing topic: ${topicKey}`);

    if (!Array.isArray(questions)) {
      console.warn(`Skipping ${topicKey} - not an array`);
      continue;
    }

    for (const questionData of questions as any[]) {
      const tutorialName = removeComments(questionData.tutorial_name || '');
      const subtopicName = removeComments(questionData.subtopic_name || '');
      const questionTitle = removeComments(questionData.question_title || '');
      const questionText = removeComments(questionData.question_text || '');
      const hint = removeComments(questionData.hint || '');
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
        console.log(`Skipping duplicate question: ${questionTitle}`);
        skippedCount++;
        continue;
      }

      const newQuestion = await prisma.question.create({
        data: {
          name: questionTitle,
          questionText: questionText,
          questionContentLink: '',
          hint: hint,
          totalMarks: questionData.total_marks || 1,
          timeLimit: questionData.time_limit_in_min || 1,
          imageFileName: questionData.image_file_name
            ? 'question-images/' + questionData.image_file_name
            : '',
          difficultyLevel:
            difficultyMap[questionData.question_difficulty] ||
            DifficultyLevel.Easy,
          stepCount: 1,
          serialNo: serialNo++,
          questionTypeId: descriptiveQuestionType.id,
          moduleId: topic.module.id,
          topicId: topic.id,
          subtopicId: subtopic.id,
          solutionBases: {
            create: {
              solutionDescriptives: {
                create: {
                  descriptiveSolution: correctAnswer,
                  descriptiveSolutionImage:
                    questionData.descriptive_solution_image
                      ? 'question-solution-images/' +
                        questionData.descriptive_solution_image
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
  console.log('Finished seeding practice questions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
