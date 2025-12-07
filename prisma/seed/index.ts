import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const roles = [
    { name: 'Admin', description: 'Admin role' },
    { name: 'Student', description: 'Student role' },
    { name: 'Teacher', description: 'Teacher role' },
    { name: 'Guardian', description: 'Guardian role' },
  ];

  for (const role of roles) {
    const newRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: {
        name: role.name,
        description: role.description,
      },
    });
    console.log(`Created role with id: ${newRole.id}`);
  }

  console.log(`Seeding finished Roles.`);

  // Seed BoardAgeLevel
  const boardAgeLevels = [
    {
      board_name: "AQA",
      level_name: "GCSE",
      description: "AQA GCSE"
    },
    {
      board_name: "AQA",
      level_name: "A_Level",
      description: "AQA A Level"
    },
    {
      board_name: "Edexcel",
      level_name: "A_Level",
      description: "Edexcel A Level"
    },
    {
      board_name: "Pearson_Edexcel",
      level_name: "GCSE",
      description: "Pearson Edexcel GCSE"
    },
    {
      board_name: "Pearson_Edexcel",
      level_name: "A_Level",
      description: "Pearson Edexcel A Level"
    },
    {
      board_name: "OCR",
      level_name: "GCSE",
      description: "OCR GCSE"
    },
    {
      board_name: "OCR",
      level_name: "A_Level",
      description: "OCR A Level"
    }
  ];

  for (const boardAgeLevel of boardAgeLevels) {
    const newBoardAgeLevel = await prisma.boardAgeLevel.upsert({
      where: { 
        boardName_ageLevelName: {
          boardName: boardAgeLevel.board_name,
          ageLevelName: boardAgeLevel.level_name
        }
      },
      update: {},
      create: {
        boardName: boardAgeLevel.board_name,
        ageLevelName: boardAgeLevel.level_name,
      },
    });
    console.log(`Created board-age level with id: ${newBoardAgeLevel.id} (${boardAgeLevel.board_name} - ${boardAgeLevel.level_name})`);
  }

  console.log(`Seeding finished BoardAgeLevel.`);

  
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
