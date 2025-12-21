import { PrismaClient, Subject, BoardName, AgeLevelName } from '@prisma/client';

const prisma = new PrismaClient();

// Run with: npx ts-node prisma/seed/add-modules.ts
async function seedModules() {
  const modulesData = [
    {
      name: 'Mathematics',
      subject: Subject.Mathematics,
      boardName: BoardName.Edexcel,
      ageLevelName: AgeLevelName.GCSE,
    },
    {
      name: 'Pure Mathematics 1',
      subject: Subject.Mathematics,
      boardName: BoardName.Edexcel,
      ageLevelName: AgeLevelName.A_Level,
    },
  ];

  for (const moduleData of modulesData) {
    const boardAgeLevel = await prisma.boardAgeLevel.findUnique({
      where: {
        boardName_ageLevelName: {
          boardName: moduleData.boardName,
          ageLevelName: moduleData.ageLevelName,
        },
      },
    });

    if (!boardAgeLevel) {
      console.log(
        `BoardAgeLevel not found for ${moduleData.boardName} - ${moduleData.ageLevelName}. Skipping module: ${moduleData.name}`,
      );
      continue;
    }

    const existingModule = await prisma.module.findFirst({
      where: {
        name: moduleData.name,
        subject: moduleData.subject,
        boardAgeLevelId: boardAgeLevel.id,
      },
    });

    if (existingModule) {
      console.log(
        `Module "${moduleData.name}" already exists for ${moduleData.boardName} - ${moduleData.ageLevelName}. Skipping.`,
      );
      continue;
    }

    await prisma.module.create({
      data: {
        name: moduleData.name,
        subject: moduleData.subject,
        boardAgeLevelId: boardAgeLevel.id,
      },
    });

    console.log(
      `Created module: ${moduleData.name} for ${moduleData.boardName} - ${moduleData.ageLevelName}`,
    );
  }

  console.log('Seeded Mathematics modules');
}

seedModules()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export default seedModules;
