import { PrismaClient, SubmissionType, SubmissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * This script seeds exam submissions for a specific exam and user.
 * It identifies the user, verifies the exam, and creates graded submissions
 * for a predefined set of question IDs.
 */
async function main() {
  // Constants for targeting a specific test scenario
  const examId = 'c8426bd8-b02d-45c0-acb3-9abb0ceca2e4';
  const userId = 'de46c6a3-5461-4fe3-b966-f8cad49c3fe7';

  console.log(`🚀 Starting seeding solutions for exam ${examId} and user ${userId}...`);

  // 1. Resolve Student: Check by primary ID first, then by Auth ID (Clerk ID)
  let student = await prisma.student.findUnique({
    where: { id: userId },
  });

  if (!student) {
    student = await prisma.student.findUnique({
      where: { authId: userId },
    });
  }

  if (!student) {
    console.error(`❌ Student with ID ${userId} not found.`);
    return;
  }

  console.log(`✅ Found student: ${student.fullName} (${student.id})`);

  // 2. Verify target Exam existence
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    console.error(`❌ Exam with ID ${examId} not found.`);
    return;
  }

  console.log(`✅ Found exam: ${exam.name}`);

  // 3. Define the questions that belong to this exam attempt
  const questionsData = [
    { serialNo: 1, questionId: 'ebc9667c-45c4-42c7-bc53-d2f83653917c' },
    { serialNo: 2, questionId: 'a3299c7d-94b4-4f70-94c6-e5a206708b4d' },
    { serialNo: 3, questionId: 'f3acb39f-8235-405d-84a2-f4ef4cb6c05e' },
    { serialNo: 4, questionId: 'f4614322-e5c2-45d1-aae3-f2b1fc5d42cf' },
    { serialNo: 5, questionId: '36cf931f-4755-4b5a-99c6-c1d03632ae75' },
    { serialNo: 6, questionId: '43d539b7-9021-435d-afbc-9f25a1662bd9' },
  ];

  // 4. Create submissions for each question
  for (const q of questionsData) {
    const question = await prisma.question.findUnique({
      where: { id: q.questionId },
      include: { 
        solutionBases: {
          include: {
            solutionMCQs: true,
            solutionDescriptives: true
          }
        },
        questionType: true
      },
    });

    if (!question) {
      console.warn(`⚠️ Question ${q.questionId} not found. Skipping.`);
      continue;
    }

    // Prevent duplicate seeding for the same student-exam-question triplet
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        studentId: student.id,
        examId: examId,
        questionId: question.id,
      },
    });

    if (existingSubmission) {
      console.log(`ℹ️ Submission already exists for question ${q.serialNo}. Skipping.`);
      continue;
    }

    // 5. Ensure a SolutionBase exists to link the submission to
    let solutionBase = question.solutionBases[0];
    if (!solutionBase) {
      solutionBase = await prisma.solutionBase.create({
        data: {
          questionId: question.id,
        },
        include: {
          solutionMCQs: true,
          solutionDescriptives: true
        }
      });
    }

    // 6. Create the parent Submission record
    const submission = await prisma.submission.create({
      data: {
        studentId: student.id,
        questionId: question.id,
        examId: examId,
        type: SubmissionType.Exam,
        status: SubmissionStatus.Graded,
        awardedMarks: question.totalMarks || 1,
        correctAnswersCount: 1,
        beganAt: new Date(Date.now() - 3600000), // Set start time to 1 hour ago
        endedAt: new Date(),
      },
    });

    // 7. Create type-specific submission details (MCQ or Descriptive)
    if (question.questionType.name === 'MCQ') {
      // For MCQs, find the correct option or default to the first one
      const correctOption = solutionBase.solutionMCQs.find(o => o.isCorrect) || solutionBase.solutionMCQs[0];
      await prisma.submittedMcq.create({
        data: {
          submissionId: submission.id,
          solutionId: solutionBase.id,
          submittedOption: correctOption?.optionText || 'Option A',
          isCorrect: true,
          awardedMark: question.totalMarks || 1,
        },
      });
    } else {
      // For Descriptive questions, provide a generic correct-looking answer
      const solutionText = solutionBase.solutionDescriptives[0]?.descriptiveSolution || 'The correct answer is derived using standard algebraic methods.';
      await prisma.submittedDescriptive.create({
        data: {
          submissionId: submission.id,
          solutionId: solutionBase.id,
          descriptiveSubmittedAnswer: `Student's solution: ${solutionText}`,
          canvasData: "",
          isCorrect: true,
          awardedMarks: question.totalMarks || 1,
          verdict: 'correct'
        },
      });
    }

    console.log(`✅ Created submission for question ${q.serialNo} (${question.name})`);
  }

  console.log('🏁 Seeding of exam solutions completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

