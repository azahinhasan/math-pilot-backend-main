import { PrismaClient, DifficultyLevel, QuestionFor } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Run with: npx ts-node prisma/seed/question/a-level-past-paper-questions-descriptive.ts
const prisma = new PrismaClient();

function removeComments(text: string): string {
  if (!text || text.trim() === '') return text;
  return text.trim();
}

function normalizeString(str: string): string {
  return str.replace(/\s+/g, '').toLowerCase();
}

function extractTopicName(topicName: string): string {
  const parts = topicName.split('-');
  if (parts.length > 1) {
    return parts.slice(1).join('-').trim();
  }
  return topicName.trim();
}

function parseSeasonYear(
  seasonYear: string,
): { season: string; year: number } | null {
  if (!seasonYear) return null;

  const parts = seasonYear.split('_');
  if (parts.length !== 2) return null;

  const year = parseInt(parts[0]);
  const month = parts[1];
  let season = 'Unknown';

  if (['january'].includes(month.toLowerCase())) season = 'Winter';
  if (['october'].includes(month.toLowerCase())) season = 'Fall';
  if (['may', 'june'].includes(month.toLowerCase())) season = 'Summer';

  if (isNaN(year)) return null;

  return { season, year };
}

async function main() {
  console.log('Seeding past paper questions...');

  const pastPaperQusPath = path.join(
    __dirname,
    'a-level-Math-question-descriptive-past-paper.json',
  );
  const pastPaperQusFile = fs.readFileSync(pastPaperQusPath, 'utf-8');
  const pastPaperQusData = JSON.parse(pastPaperQusFile);

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
  let invalidSeasonYear = 0;
  const notFoundTopics: string[] = [];
  const notFoundSubtopics: { topic: string; subtopic: string }[] = [];

  // Fetch all topics and subtopics once for better performance
  const allTopics = await prisma.topic.findMany({
    include: {
      module: {
        include: {
          boardAgeLevel: true,
        },
      },
    },
  });

  const allSubtopics = await prisma.subtopic.findMany();

  // Create normalized lookup maps
  const topicMap = new Map<string, (typeof allTopics)[0]>();
  allTopics.forEach((topic) => {
    const extractedName = extractTopicName(topic.name);
    const normalizedName = normalizeString(extractedName);
    topicMap.set(normalizedName, topic);
  });

  const subtopicMap = new Map<string, (typeof allSubtopics)[0][]>();
  allSubtopics.forEach((subtopic) => {
    const normalizedName = normalizeString(subtopic.name);
    if (!subtopicMap.has(normalizedName)) {
      subtopicMap.set(normalizedName, []);
    }
    subtopicMap.get(normalizedName)!.push(subtopic);
  });

  for (const questionData of pastPaperQusData) {
    if (
      !questionData.topic_name ||
      !questionData.subtopic_name ||
      !questionData.question_title ||
      !questionData.season_year
    ) {
      console.warn(
        `Skipping question due to missing required fields - Topic: "${questionData.topic_name}", Subtopic: "${questionData.subtopic_name}", Title: "${questionData.question_title}", Season/Year: "${questionData.season_year}"`,
      );
      skippedCount++;
      continue;
    }

    const topicName = removeComments(questionData.topic_name || '');
    const subtopicName = removeComments(questionData.subtopic_name || '');
    const questionTitle = removeComments(questionData.question_title || '');
    const questionText = removeComments(questionData.question_text || '');
    const hint = removeComments(questionData.hint || '');
    const serialNo = removeComments(questionData.seriel_no?.toString() || '1');
    const correctAnswer = removeComments(questionData.correct_answer || '');
    const seasonYear = removeComments(questionData.season_year || '');

    // Parse season_year
    const parsedSeasonYear = parseSeasonYear(seasonYear);
    if (!parsedSeasonYear) {
      console.error(
        `Invalid season_year format: "${seasonYear}" for question: ${questionTitle}`,
      );
      invalidSeasonYear++;
      skippedCount++;
      continue;
    }

    const { season, year } = parsedSeasonYear;

    // Find topic using normalized matching
    const normalizedTopicName = normalizeString(topicName);
    const topic = topicMap.get(normalizedTopicName);

    if (!topic) {
      console.error(
        `Topic "${topicName}" not found for question: ${questionTitle}`,
      );
      notFoundTopic++;
      if (!notFoundTopics.includes(topicName)) {
        notFoundTopics.push(topicName);
      }
      continue;
    }

    // Find subtopic using normalized matching
    const normalizedSubtopicName = normalizeString(subtopicName);
    const subtopicCandidates = subtopicMap.get(normalizedSubtopicName) || [];
    const subtopic = subtopicCandidates.find((s) => s.topicId === topic.id);

    if (!subtopic) {
      console.error(
        `Subtopic "${subtopicName}" not found in topic "${topicName}" for question: ${questionTitle}`,
      );
      notFoundSubtopic++;
      const notFoundEntry = { topic: topicName, subtopic: subtopicName };
      if (
        !notFoundSubtopics.some(
          (item) => item.topic === topicName && item.subtopic === subtopicName,
        )
      ) {
        notFoundSubtopics.push(notFoundEntry);
      }
      continue;
    }

    // Check for existing question based on multiple fields
    const existingQuestion = await prisma.question.findFirst({
      where: {
        topicId: topic.id,
        subtopicId: subtopic.id,
        name: questionTitle,
        questionText: questionText,
        hint: hint,
        solutionBases: {
          some: {
            solutionDescriptives: {
              some: {
                descriptiveSolution: correctAnswer,
              },
            },
          },
        },
      },
      include: {
        questionSets: {
          include: {
            pastPaper: true,
          },
        },
      },
    });

    if (existingQuestion) {
      // Check if this exact season_year combination exists
      const hasSameSeasonYear = existingQuestion.questionSets.some(
        (qs) =>
          qs.pastPaper &&
          qs.pastPaper.season === season &&
          qs.pastPaper.year === year,
      );

      if (hasSameSeasonYear) {
        console.log(
          `Skipping duplicate question: ${questionTitle} (${season}_${year}) - ${existingQuestion.id}`,
        );
        skippedCount++;
        continue;
      }
    }

    // Find or create PastPaper
    let pastPaper = await prisma.pastPaper.findFirst({
      where: {
        season: season,
        year: year,
        moduleId: topic.module.id,
        boardId: topic.module.boardAgeLevelId,
      },
    });

    if (!pastPaper) {
      const pastPaperName = `${season}_${year}`;
      pastPaper = await prisma.pastPaper.create({
        data: {
          name: pastPaperName,
          season: season,
          year: year,
          moduleId: topic.module.id,
          boardId: topic.module.boardAgeLevelId,
        },
      });
      console.log(`Created PastPaper: ${pastPaperName} - ${pastPaper.id}`);
    }

    // Create question
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
                  questionData.canvas === 'Yes' || questionData.Canvas === 'Yes'
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

    // Create QuestionSet to link question with PastPaper
    await prisma.questionSet.create({
      data: {
        serialNo: parseInt(serialNo) || null,
        questionId: newQuestion.id,
        pastPaperId: pastPaper.id,
        moduleId: topic.module.id,
      },
    });

    // Update PastPaper timeLimit by summing all question time limits
    const allQuestionsInPastPaper = await prisma.question.findMany({
      where: {
        questionSets: {
          some: {
            pastPaperId: pastPaper.id,
          },
        },
      },
      select: {
        timeLimit: true,
      },
    });

    const totalTimeLimit = allQuestionsInPastPaper.reduce(
      (sum, q) => sum + (q.timeLimit || 0),
      0,
    );

    await prisma.pastPaper.update({
      where: { id: pastPaper.id },
      data: { timeLimit: totalTimeLimit },
    });

    console.log(
      `Created question with id: ${newQuestion.id} - ${questionTitle} (${season}_${year})`,
    );
    createdCount++;
  }

  console.log('\n=== Seeding Summary ===');
  console.log(`Created: ${createdCount} questions`);
  console.log(`Skipped: ${skippedCount} duplicate questions`);
  console.log(`Not found topic: ${notFoundTopic} questions`);
  console.log(`Not found subtopic: ${notFoundSubtopic} questions`);
  console.log(`Invalid season_year: ${invalidSeasonYear} questions`);

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

  console.log('\nFinished seeding past paper questions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
