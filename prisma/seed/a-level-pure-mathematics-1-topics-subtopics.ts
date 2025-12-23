import { PrismaClient, Subject, AgeLevelName } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Run with: npx ts-node prisma/seed/a-level-pure-mathematics-1-topics-subtopics.ts


async function seedGCSEMathTopicsSubtopics() {
  console.log("Staring seeing topics and subtopics for AgeLevel: GCSE and Module: Mathematics");
  const jsonFilePath = path.join(
    __dirname,
    'json',
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

  let topicSerialNumber = 1;
  let subtopicSerialNumber = 1;

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

      if (existingSubtopic) {
        console.log(
          `Subtopic "${subtopicName}" already exists under topic "${topicName}". Skipping.`,
        );
        continue;
      }

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
      subtopicSerialNumber++;
    }
  }

  console.log('Seeded GCSE Math topics and subtopics');
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
