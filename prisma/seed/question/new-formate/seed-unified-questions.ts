import { PrismaClient, DifficultyLevel, QuestionFor } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// npx ts-node prisma/seed/question/new-formate/seed-unified-questions.ts

function removeComments(text: string): string {
  if (!text || text.trim() == '') return text;
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

async function main() {
  console.log('Seeding unified questions (Practice & Test, MCQ & Descriptive)...');

  const jsonFilePath = path.join(
    __dirname,
    'edexcel-A_Level-Mathematics-General_Mathematics.json',
  );
  const jsonFile = fs.readFileSync(jsonFilePath, 'utf-8');
  const questionsData = JSON.parse(jsonFile);

  const descriptiveQuestionType = await prisma.questionType.findUnique({
    where: { name: 'Descriptive' },
  });

  const mcqQuestionType = await prisma.questionType.findUnique({
    where: { name: 'MCQ' },
  });

  if (!descriptiveQuestionType || !mcqQuestionType) {
    console.error(
      'Question types not found. Please seed question types first (Descriptive and MCQ).',
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
  let invalidData = 0;
  const notFoundTopics: string[] = [];
  const notFoundSubtopics: { topic: string; subtopic: string }[] = [];

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

  const topicMap = new Map<string, typeof allTopics[0]>();
  allTopics.forEach((topic) => {
    const normalizedName = normalizeString(topic.name);
    topicMap.set(normalizedName, topic);
  });

  const subtopicMap = new Map<string, typeof allSubtopics[0][]>();
  allSubtopics.forEach((subtopic) => {
    const normalizedName = normalizeString(subtopic.name);
    if (!subtopicMap.has(normalizedName)) {
      subtopicMap.set(normalizedName, []);
    }
    subtopicMap.get(normalizedName)!.push(subtopic);
  });

  for (const [topicKey, questions] of Object.entries(questionsData)) {
    console.log(`\nProcessing chapter: ${topicKey}`);

    if (!Array.isArray(questions)) {
      console.warn(`Skipping ${topicKey} - not an array`);
      continue;
    }

    for (const questionData of questions as any[]) {
      if (
        !questionData.subtopic_name ||
        !questionData.question_title ||
        !questionData.question_for
      ) {
        console.warn(
          `Skipping question due to missing required fields - Subtopic: "${questionData.subtopic_name}", Name: "${questionData.question_title}", For: "${questionData.question_for}"`,
        );
        skippedCount++;
        continue;
      }

      const subtopicName = removeComments(questionData.subtopic_name || '');
      const questionName = removeComments(questionData.question_title || '');
      const questionText = removeComments(questionData.question_text || '');
      const hint = removeComments(questionData.hint || '');
      const explanation = removeComments(questionData.explanation || '');
      const serialNo = removeComments(
        questionData.serial_no?.toString() || '1',
      );
      const questionFor = removeComments(questionData.question_for || '');
      const questionType = removeComments(questionData.question_type || '');

      const normalizedTopicName = normalizeString(topicKey);
      const topic = topicMap.get(normalizedTopicName);

      if (!topic) {
        console.error(
          `Topic "${topicKey}" not found for question: ${questionName}`,
        );
        notFoundTopic++;
        if (!notFoundTopics.includes(topicKey)) {
          notFoundTopics.push(topicKey);
        }
        continue;
      }

      const normalizedSubtopicName = normalizeString(subtopicName);
      const subtopicCandidates = subtopicMap.get(normalizedSubtopicName) || [];
      const subtopic = subtopicCandidates.find((s) => s.topicId == topic.id);

      if (!subtopic) {
        console.error(
          `Subtopic "${subtopicName}" not found in topic "${topicKey}" for question: ${questionName}`,
        );
        notFoundSubtopic++;
        const notFoundEntry = { topic: topicKey, subtopic: subtopicName };
        if (
          !notFoundSubtopics.some(
            (item) =>
              item.topic == topicKey && item.subtopic == subtopicName,
          )
        ) {
          notFoundSubtopics.push(notFoundEntry);
        }
        continue;
      }

      const isTest = questionFor == 'Test';
      const isPractice = questionFor == 'Practice';
      const isMCQ = questionType == 'MCQ' || questionType == 'Boolean';
      const isDescriptive = questionType == 'Descriptive';

      if (!isTest && !isPractice) {
        console.warn(
          `Invalid question_for value: "${questionFor}" for question: ${questionName}`,
        );
        invalidData++;
        skippedCount++;
        continue;
      }

      if (!isMCQ && !isDescriptive) {
        console.warn(
          `Invalid question_type value: "${questionType}" for question: ${questionName}`,
        );
        invalidData++;
        skippedCount++;
        continue;
      }

      let pastPaper: any = null;
      let shouldCreatePastPaper = false;

      if (isTest) {
        const pastPaperName = removeComments(
          questionData.past_paper_name || '',
        );
        const pastPaperSeason = removeComments(
          questionData.past_paper_season || '',
        );
        const pastPaperYear = questionData.past_paper_year;

        if (pastPaperSeason && pastPaperYear) {
          shouldCreatePastPaper = true;

          pastPaper = await prisma.pastPaper.findFirst({
            where: {
              season: pastPaperSeason,
              year: pastPaperYear,
              moduleId: topic.module.id,
              boardId: topic.module.boardAgeLevelId,
            },
          });

          if (!pastPaper) {
            const paperName =
              pastPaperName || `${pastPaperSeason}_${pastPaperYear}`;
            pastPaper = await prisma.pastPaper.create({
              data: {
                name: paperName,
                season: pastPaperSeason,
                year: pastPaperYear,
                moduleId: topic.module.id,
                boardId: topic.module.boardAgeLevelId,
              },
            });
            console.log(`Created PastPaper: ${paperName} - ${pastPaper.id}`);
          }
        }
      }

      const existingQuestion = await prisma.question.findFirst({
        where: {
          topicId: topic.id,
          subtopicId: subtopic.id,
          name: questionName,
          questionText: questionText,
        },
      });

      if (existingQuestion) {
        console.log(
          `Skipping duplicate question: ${questionName} - ${existingQuestion.id}`,
        );
        skippedCount++;
        continue;
      }

      if (isMCQ) {
        const option1 = removeComments(
          questionData.mcq_option_1_text?.toString() || '',
        );
        const option2 = removeComments(
          questionData.mcq_option_2_text?.toString() || '',
        );
        const option3 = removeComments(
          questionData.mcq_option_3_text?.toString() || '',
        );
        const option4 = removeComments(
          questionData.mcq_option_4_text?.toString() || '',
        );
        const correctAnswer = removeComments(
          questionData.solution_text?.toString() || '',
        );

        if (!option1 || !option2 || !correctAnswer) {
          console.warn(
            `Skipping MCQ question due to missing options or solution: ${questionName}`,
          );
          skippedCount++;
          continue;
        }

        const newQuestion = await prisma.question.create({
          data: {
            name: questionName,
            questionText: questionText,
            questionContentLink: '',
            hint: hint,
            explanation: explanation,
            questionFor: isTest ? QuestionFor.Test : QuestionFor.Practice,
            totalMarks: questionData.total_marks || 1,
            timeLimit: questionData.time_limit_in_min || 0,
            imageFileName: questionData.question_image
              ? 'question-images/' + questionData.question_image
              : '',
            difficultyLevel:
              difficultyMap[questionData.question_difficulty] ||
              DifficultyLevel.Easy,
            stepCount: 1,
            serialNo: serialNo,
            questionTypeId: mcqQuestionType.id,
            moduleId: topic.module.id,
            topicId: topic.id,
            subtopicId: subtopic.id,
            solutionBases: {
              create: {
                solutionMCQs: {
                  create: [
                    {
                      optionText: option1,
                      isCorrect: option1 == correctAnswer,
                      mark: option1 == correctAnswer ? questionData.total_marks || 1 : 0,
                    },
                    {
                      optionText: option2,
                      isCorrect: option2 == correctAnswer,
                      mark: option2 == correctAnswer ? questionData.total_marks || 1 : 0,
                    },
                    {
                      optionText: option3,
                      isCorrect: option3 == correctAnswer,
                      mark: option3 == correctAnswer ? questionData.total_marks || 1 : 0,
                    },
                    {
                      optionText: option4,
                      isCorrect: option4 == correctAnswer,
                      mark: option4 == correctAnswer ? questionData.total_marks || 1 : 0,
                    },
                  ],
                },
              },
            },
          },
        });

        if (shouldCreatePastPaper && pastPaper) {
          await prisma.questionSet.create({
            data: {
              serialNo: parseInt(serialNo) || null,
              questionId: newQuestion.id,
              pastPaperId: pastPaper.id,
              moduleId: topic.module.id,
            },
          });

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
        }

        console.log(
          `Created MCQ question with id: ${newQuestion.id} - ${questionName} (${questionFor})`,
        );
        createdCount++;
      } else if (isDescriptive) {
        const solutionText = removeComments(
          questionData.solution_text?.toString() || '',
        );
        const solutionImage = removeComments(
          questionData.solution_image || '',
        );

        const newQuestion = await prisma.question.create({
          data: {
            name: questionName,
            questionText: questionText,
            questionContentLink: '',
            hint: hint,
            explanation: explanation,
            questionFor: isTest ? QuestionFor.Test : QuestionFor.Practice,
            totalMarks: questionData.total_marks || 1,
            timeLimit: questionData.time_limit_in_min || 0,
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
                      questionData.on_canvas == true ||
                      questionData.on_canvas == 'Yes'
                        ? true
                        : false,
                    descriptiveSolution: solutionText || null,
                    descriptiveSolutionImage: solutionImage
                      ? 'question-solution-images/' + solutionImage
                      : null,
                  },
                },
              },
            },
          },
        });

        if (shouldCreatePastPaper && pastPaper) {
          await prisma.questionSet.create({
            data: {
              serialNo: parseInt(serialNo) || null,
              questionId: newQuestion.id,
              pastPaperId: pastPaper.id,
              moduleId: topic.module.id,
            },
          });

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
        }

        console.log(
          `Created Descriptive question with id: ${newQuestion.id} - ${questionName} (${questionFor})`,
        );
        createdCount++;
      }
    }
  }

  console.log('\n== Seeding Summary ==');
  console.log(`Created: ${createdCount} questions`);
  console.log(`Skipped: ${skippedCount} duplicate/invalid questions`);
  console.log(`Not found topic: ${notFoundTopic} questions`);
  console.log(`Not found subtopic: ${notFoundSubtopic} questions`);
  console.log(`Invalid data: ${invalidData} questions`);

  if (notFoundTopics.length > 0) {
    console.log('\n== Topics Not Found ==');
    notFoundTopics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic}`);
    });
  }

  if (notFoundSubtopics.length > 0) {
    console.log('\n== Subtopics Not Found ==');
    notFoundSubtopics.forEach((item, index) => {
      console.log(
        `${index + 1}. Topic: "${item.topic}" - Subtopic: "${item.subtopic}"`,
      );
    });
  }

  console.log('\nFinished seeding unified questions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
