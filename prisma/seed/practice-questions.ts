import { PrismaClient, DifficultyLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';


// Run with: npx ts-node prisma/seed/practice-questions.ts

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding practice questions...');

  const practiceQusPath = path.join(__dirname, 'json', 'practice_qus.json');
  const practiceQusFile = fs.readFileSync(practiceQusPath, 'utf-8');
  const practiceQusData = JSON.parse(practiceQusFile);

  const descriptiveQuestionType = await prisma.questionType.findUnique({
    where: { name: 'Descriptive' },
  });

  if (!descriptiveQuestionType) {
    console.error('"Descriptive" question type not found. Please seed question types first.');
    return;
  }

  for (const [index, questionData] of practiceQusData.practice.entries()) {
    const difficultyMap: { [key: string]: DifficultyLevel } = {
      Easy: DifficultyLevel.Easy,
      Medium: DifficultyLevel.Medium,
      Hard: DifficultyLevel.Hard,
    };

    const module = await prisma.module.findFirst({
      where: { name: questionData.module_name },
    });
    if (!module) {
      console.error(`Module "${questionData.module_name}" not found for question: ${questionData.question_name}`);
      continue;
    }

    const topic = await prisma.topic.findFirst({
      where: { 
        name: questionData.topic_name,
        moduleId: module.id 
      },
    });
    if (!topic) {
      console.error(`Topic "${questionData.topic_name}" not found in module "${questionData.module_name}" for question: ${questionData.question_name}`);
      continue;
    }

    const subtopic = await prisma.subtopic.findFirst({
      where: { 
        name: questionData.subtopic_name,
        topicId: topic.id 
      },
    });
    if (!subtopic) {
      console.error(`Subtopic "${questionData.subtopic_name}" not found in topic "${questionData.topic_name}" for question: ${questionData.question_name}`);
      continue;
    }

    const newQuestion = await prisma.question.create({
      data: {
        name: questionData.question_name,
        questionText: questionData.question_text,
        questionContentLink: '',
        hint: questionData.hint,
        totalMarks: questionData.total_marks,
        timeLimit: questionData.time_Limit,
        imageUrl: questionData.image,
        difficulty_level: difficultyMap[questionData.difficulty_level] || DifficultyLevel.Easy,
        stepCount: 1,
        serialNo: index + 1,
        questionTypeId: descriptiveQuestionType.id,
        moduleId: module.id,
        topicId: topic.id,
        subtopicId: subtopic.id,
        solutionBases: {
          create: {
            solutionDescriptives: {
              create: {
                descriptiveSolution: questionData.correct_answer,
              },
            },
          },
        },
      },
    });
    console.log(`Created question with id: ${newQuestion.id}`);
  }

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
