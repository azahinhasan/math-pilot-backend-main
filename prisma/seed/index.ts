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

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
