import { PrismaClient, Subject, AgeLevelName } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Run with: npx ts-node prisma/seed/a-level-pure-mathematics-1-topics-subtopics.ts


async function seedGCSEMathTopicsSubtopics() {
  console.log("Staring seeing topics and subtopics for AgeLevel: GCSE and Module: Mathematics");
  const jsonFilePath = path.join(
    __dirname,
    'A level-Pure Mathematics - 1 Topics and subtopics.json',
  );

  const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
  const topicsData = JSON.parse(rawData);

  const module = await prisma.module.findFirst({
    where: {
      name: 'Pure Mathematics 1',
      subject: Subject.Mathematics,
      boardAgeLevel: {
        ageLevelName: AgeLevelName.A_Level,
      },
    },
    include: {
      boardAgeLevel: true,
    },
  });

  if (!module) {
    console.log(
      'Mathematics module not found for GCSE. Please seed modules first.',
    );
    return;
  }

  const maxTopicSerial = await prisma.topic.findFirst({
    where: { moduleId: module.id },
    orderBy: { serialNumber: 'desc' },
    select: { serialNumber: true },
  });

  const maxSubtopicSerial = await prisma.subtopic.findFirst({
    where: { boardAgeLevelId: module.boardAgeLevelId },
    orderBy: { serialNumber: 'desc' },
    select: { serialNumber: true },
  });

  let topicSerialNumber = (maxTopicSerial?.serialNumber || 0) + 1;
  let subtopicSerialNumber = (maxSubtopicSerial?.serialNumber || 0) + 1;

  const newTopics: string[] = [];
  const newSubtopics: string[] = [];

  for (const chapterGroup of topicsData) {
    const chapterKeys = Object.keys(chapterGroup);

    for (const chapterKey of chapterKeys) {
      const topicName = chapterKey;
      const subtopicName = chapterGroup[chapterKey];

      let topic = await prisma.topic.findFirst({
        where: {
          name: topicName,
          moduleId: module.id,
        },
      });

      if (!topic) {
        topic = await prisma.topic.create({
          data: {
            name: topicName,
            moduleId: module.id,
            serialNumber: topicSerialNumber,
            paperNumber: 1,
          },
        });

        console.log(
          `Created topic: ${topicName} (Serial: ${topicSerialNumber})`,
        );
        newTopics.push(topicName);
        topicSerialNumber++;
      } else {
        console.log(
          `Topic "${topicName}" already exists. Using existing topic.`,
        );
      }

      const existingSubtopic = await prisma.subtopic.findFirst({
        where: {
          name: subtopicName,
          topicId: topic.id,
        },
      });

      if (!existingSubtopic) {
        await prisma.subtopic.create({
          data: {
            name: subtopicName,
            topicId: topic.id,
            serialNumber: subtopicSerialNumber,
            boardAgeLevelId: module.boardAgeLevelId,
          },
        });

        console.log(
          `Created subtopic: ${subtopicName} under topic: ${topicName} (Serial: ${subtopicSerialNumber})`,
        );
        newSubtopics.push(subtopicName);
        subtopicSerialNumber++;
      } else {
        console.log(
          `Subtopic "${subtopicName}" already exists under topic "${topicName}". Skipping.`,
        );
      }
    }
  }

  console.log('Seeded GCSE Math topics and subtopics');
  console.log('\n=== NEWLY CREATED ITEMS ===');
  console.log('\nTopics not found (newly created):');
  console.log(newTopics);
  console.log('\nSubtopics not found (newly created):');
  console.log(newSubtopics);
  console.log(`\nTotal new topics: ${newTopics.length}`);
  console.log(`Total new subtopics: ${newSubtopics.length}`);
}

// export default seedGCSEMathTopicsSubtopics;
seedGCSEMathTopicsSubtopics()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
