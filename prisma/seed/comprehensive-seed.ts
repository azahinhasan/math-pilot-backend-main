import { PrismaClient, SubmissionType, SubmissionStatus } from '@prisma/client';
import { seedExams } from './exam-data';

const prisma = new PrismaClient();

/**
 * Comprehensive seeding that:
 * 1. Seeds performance data (modules, topics, questions, students)
 * 2. Seeds exams
 * 3. Links submissions to exams
 */
export async function comprehensiveSeed() {
  console.log('🚀 Starting comprehensive seeding with exam linkage...\n');

  // Import the main function from performance-data
  // We'll run it first to get all the base data
  const { execSync } = require('child_process');
  
  console.log('📊 Step 1: Seeding base performance data...');
  try {
    execSync('npx ts-node prisma/seed/performance-data.ts', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error seeding performance data:', error);
    throw error;
  }

  console.log('\n📝 Step 2: Seeding exams...');
  const { exams } = await seedExams();

  if (exams.length === 0) {
    console.log('⚠️  No exams created, skipping exam linkage');
    return;
  }

  console.log('\n🔗 Step 3: Linking existing submissions to exams...');

  // Get students
  const students = await prisma.student.findMany({
    where: {
      auth: {
        email: {
          in: ['student1@test.com', 'student2@test.com', 'student3@test.com'],
        },
      },
    },
    include: {
      auth: true,
    },
  });

  if (students.length === 0) {
    console.log('⚠️  No students found');
    return;
  }

  // Get modules to map questions to exams
  const modules = await prisma.module.findMany({
    where: {
      name: { in: ['Algebra', 'Geometry', 'Number'] },
    },
    include: {
      questions: {
        select: { id: true, moduleId: true },
      },
    },
  });

  const algebraModule = modules.find((m) => m.name === 'Algebra');
  const geometryModule = modules.find((m) => m.name === 'Geometry');
  const numberModule = modules.find((m) => m.name === 'Number');

  // Map exams by name for easy access
  const examMap: Record<string, any> = {};
  exams.forEach((exam) => {
    examMap[exam.name] = exam;
  });

  // Strategy: Update existing Exam-type submissions to link to actual exams
  // We'll distribute them across the exams based on time and module

  for (const student of students) {
    const examSubmissions = await prisma.submission.findMany({
      where: {
        studentId: student.id,
        type: SubmissionType.Exam,
        examId: null, // Only update submissions not yet linked
      },
      include: {
        question: {
          select: {
            id: true,
            moduleId: true,
          },
        },
      },
      orderBy: {
        beganAt: 'asc',
      },
    });

    if (examSubmissions.length === 0) {
      console.log(`  No unlabeled exam submissions for ${student.fullName}`);
      continue;
    }

    console.log(
      `  Found ${examSubmissions.length} exam submissions for ${student.fullName}`,
    );

    // Group submissions by date range to match them to exams
    const submissionGroups: Record<string, string[]> = {
      'Algebra Final Exam': [], // 6 weeks ago
      'Combined Mathematics Mock Exam': [], // 1 month ago
      'Algebra Midterm Exam': [], // 2 weeks ago
      'Geometry Assessment': [], // 1 week ago
      'Number Theory Quiz': [], // 3 days ago
    };

    // Distribute submissions to exams based on question module and time
    for (const submission of examSubmissions) {
      const questionModuleId = submission.question.moduleId;
      const submissionDate = new Date(submission.beganAt);
      const now = new Date();
      const daysAgo = Math.floor(
        (now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let targetExam = '';

      // Assign based on date ranges and module
      if (daysAgo > 35) {
        // > 5 weeks ago
        if (questionModuleId === algebraModule?.id) {
          targetExam = 'Algebra Final Exam';
        } else {
          targetExam = 'Combined Mathematics Mock Exam';
        }
      } else if (daysAgo > 20) {
        // 3-5 weeks ago
        targetExam = 'Combined Mathematics Mock Exam';
      } else if (daysAgo > 10) {
        // 10-20 days ago
        targetExam = 'Algebra Midterm Exam';
      } else if (daysAgo > 5) {
        // 5-10 days ago
        targetExam = 'Geometry Assessment';
      } else {
        // < 5 days ago
        targetExam = 'Number Theory Quiz';
      }

      // Distribute evenly if an exam has too many submissions
      const maxPerExam = 30;
      if (submissionGroups[targetExam].length >= maxPerExam) {
        // Find exam with fewest submissions
        const examWithFewest = Object.keys(submissionGroups).reduce((a, b) =>
          submissionGroups[a].length < submissionGroups[b].length ? a : b,
        );
        targetExam = examWithFewest;
      }

      submissionGroups[targetExam].push(submission.id);
    }

    // Update submissions with examId
    let updatedCount = 0;
    for (const [examName, submissionIds] of Object.entries(submissionGroups)) {
      if (submissionIds.length === 0) continue;

      const exam = examMap[examName];
      if (!exam) {
        console.log(`  ⚠️  Exam not found: ${examName}`);
        continue;
      }

      await prisma.submission.updateMany({
        where: {
          id: { in: submissionIds },
        },
        data: {
          examId: exam.id,
        },
      });

      updatedCount += submissionIds.length;
      console.log(
        `    ✓ Linked ${submissionIds.length} submissions to "${examName}"`,
      );
    }

    console.log(
      `  ✅ Updated ${updatedCount} submissions for ${student.fullName}\n`,
    );
  }

  console.log('✅ Comprehensive seeding complete!\n');
  console.log('Summary:');
  console.log(`  - ${exams.length} exams created`);
  console.log(`  - Submissions linked to exams`);
  console.log(`  - ${students.length} students processed`);
}

// Allow running this file directly
if (require.main === module) {
  comprehensiveSeed()
    .catch((e) => {
      console.error('❌ Error during comprehensive seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default comprehensiveSeed;

