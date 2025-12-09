import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedQuestionTypes() {
  const questionTypes = [
    {
      name: 'MCQ',
      description: 'Multiple Choice Question',
    },
    {
      name: 'Descriptive',
      description: 'Descriptive or free-form answer question',
    },
  ];

  for (const qt of questionTypes) {
    await prisma.questionType.upsert({
      where: { name: qt.name },
      update: {},
      create: {
        name: qt.name,
        description: qt.description,
      },
    });
  }

  console.log('Seeded question types');
}

export default seedQuestionTypes;
