import { PrismaClient, SubmissionType, SubmissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function addSeconds(date: Date, seconds: number): Date {
  const newDate = new Date(date);
  newDate.setSeconds(newDate.getSeconds() + seconds);
  return newDate;
}

async function main() {
  console.log('🚀 Adding Exam and Homework submissions for Alice Johnson...\n');

  // Find Alice Johnson
  const aliceAuth = await prisma.auth.findUnique({
    where: { email: 'student1@test.com' },
    include: { student: true },
  });

  if (!aliceAuth || !aliceAuth.student) {
    console.error('❌ Alice Johnson (student1@test.com) not found!');
    console.log('💡 Please run: npm run db:seed:performance first');
    process.exit(1);
  }

  const student = aliceAuth.student;
  console.log(`✅ Found student: ${student.fullName} (${aliceAuth.email})\n`);

  // Get some existing questions to create submissions for
  const questions = await prisma.question.findMany({
    take: 15,
    include: {
      topic: {
        include: {
          module: true,
        },
      },
      solutionBases: {
        include: {
          solutionMCQs: true,
          solutionDescriptives: true,
        },
      },
    },
  });

  if (questions.length === 0) {
    console.error('❌ No questions found in database!');
    console.log('💡 Please run: npm run db:seed:performance first');
    process.exit(1);
  }

  console.log(
    `✅ Found ${questions.length} questions to create submissions from\n`,
  );

  // ==================== EXAM SUBMISSIONS ====================
  console.log('📝 Creating Exam submissions...');

  const examSubmissions = [
    // Exam 1 - Mid-term exam (5 questions, taken 20 days ago)
    {
      questionId: questions[0].id,
      correct: true,
      marksRatio: 1.0, // 100% of marks
      timeTaken: 120,
    },
    {
      questionId: questions[1].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 150,
    },
    {
      questionId: questions[2].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 300,
    },
    {
      questionId: questions[3].id,
      correct: false,
      marksRatio: 0.33, // 33% of marks (partial credit)
      timeTaken: 240,
    },
    {
      questionId: questions[4].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 360,
    },
  ];

  let examCount = 0;
  for (const sub of examSubmissions) {
    const question = questions.find((q) => q.id === sub.questionId);
    if (!question) continue;

    // Calculate awarded marks based on question's total marks and ratio
    const awardedMarks = Math.round(
      (question.totalMarks || 0) * sub.marksRatio,
    );

    const beganAt = daysAgo(20);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student.id,
        questionId: sub.questionId,
        type: SubmissionType.Exam,
        status: SubmissionStatus.Graded,
        awardedMarks: awardedMarks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });

    // Add submission details based on question type
    if (question.solutionBases && question.solutionBases.length > 0) {
      const solutionBase = question.solutionBases[0];
      if (solutionBase.solutionMCQs.length > 0) {
        // MCQ submission
        const correctOption = solutionBase.solutionMCQs.find(
          (mcq) => mcq.isCorrect,
        );
        const incorrectOption = solutionBase.solutionMCQs.find(
          (mcq) => !mcq.isCorrect,
        );
        const selectedOption = sub.correct ? correctOption : incorrectOption;

        await prisma.submittedMcq.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            submittedOption: selectedOption?.optionText || '',
            isCorrect: sub.correct,
            awardedMark: awardedMarks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        // Descriptive submission
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Complete and correct exam answer'
              : 'Partially correct exam answer with minor errors',
            awardedMarks: awardedMarks,
          },
        });
      }
    }

    examCount++;
  }

  console.log(
    `   ✅ Created ${examCount} Exam submissions (Mid-term Exam - 20 days ago)\n`,
  );

  // Exam 2 - Recent quiz (3 questions, taken 5 days ago)
  const exam2Submissions = [
    {
      questionId: questions[5].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 90,
    },
    {
      questionId: questions[6].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 180,
    },
    {
      questionId: questions[7].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 120,
    },
  ];

  let exam2Count = 0;
  for (const sub of exam2Submissions) {
    const question = questions.find((q) => q.id === sub.questionId);
    if (!question) continue;

    const awardedMarks = Math.round(
      (question.totalMarks || 0) * sub.marksRatio,
    );

    const beganAt = daysAgo(5);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student.id,
        questionId: sub.questionId,
        type: SubmissionType.Exam,
        status: SubmissionStatus.Graded,
        awardedMarks: awardedMarks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });

    // Add submission details
    if (question.solutionBases && question.solutionBases.length > 0) {
      const solutionBase = question.solutionBases[0];
      if (solutionBase.solutionMCQs.length > 0) {
        const correctOption = solutionBase.solutionMCQs.find(
          (mcq) => mcq.isCorrect,
        );
        const incorrectOption = solutionBase.solutionMCQs.find(
          (mcq) => !mcq.isCorrect,
        );
        const selectedOption = sub.correct ? correctOption : incorrectOption;

        await prisma.submittedMcq.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            submittedOption: selectedOption?.optionText || '',
            isCorrect: sub.correct,
            awardedMark: awardedMarks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Complete and correct exam answer'
              : 'Partially correct exam answer',
            awardedMarks: awardedMarks,
          },
        });
      }
    }

    exam2Count++;
  }

  console.log(
    `   ✅ Created ${exam2Count} Exam submissions (Recent Quiz - 5 days ago)\n`,
  );

  // ==================== HOMEWORK SUBMISSIONS ====================
  console.log('📚 Creating Homework submissions...');

  const homeworkSubmissions = [
    // Homework 1 - Weekly assignment (4 questions, taken 14 days ago)
    {
      questionId: questions[8].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 600,
    },
    {
      questionId: questions[9].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 900,
    },
    {
      questionId: questions[10] ? questions[10].id : questions[0].id,
      correct: false,
      marksRatio: 0.5, // 50% partial credit
      timeTaken: 720,
    },
    {
      questionId: questions[11] ? questions[11].id : questions[1].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 480,
    },
  ];

  let homeworkCount = 0;
  for (const sub of homeworkSubmissions) {
    const question = questions.find((q) => q.id === sub.questionId);
    if (!question) continue;

    const awardedMarks = Math.round(
      (question.totalMarks || 0) * sub.marksRatio,
    );

    const beganAt = daysAgo(14);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student.id,
        questionId: sub.questionId,
        type: SubmissionType.Homework,
        status: SubmissionStatus.Graded,
        awardedMarks: awardedMarks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });

    // Add submission details
    if (question.solutionBases && question.solutionBases.length > 0) {
      const solutionBase = question.solutionBases[0];
      if (solutionBase.solutionMCQs.length > 0) {
        const correctOption = solutionBase.solutionMCQs.find(
          (mcq) => mcq.isCorrect,
        );
        const incorrectOption = solutionBase.solutionMCQs.find(
          (mcq) => !mcq.isCorrect,
        );
        const selectedOption = sub.correct ? correctOption : incorrectOption;

        await prisma.submittedMcq.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            submittedOption: selectedOption?.optionText || '',
            isCorrect: sub.correct,
            awardedMark: awardedMarks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Thorough homework solution with all steps shown'
              : 'Homework attempt with some errors in methodology',
            awardedMarks: awardedMarks,
          },
        });
      }
    }

    homeworkCount++;
  }

  console.log(
    `   ✅ Created ${homeworkCount} Homework submissions (Weekly Assignment - 14 days ago)\n`,
  );

  // Homework 2 - Recent assignment (3 questions, taken 3 days ago)
  const homework2Submissions = [
    {
      questionId: questions[12] ? questions[12].id : questions[2].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 540,
    },
    {
      questionId: questions[13] ? questions[13].id : questions[3].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 420,
    },
    {
      questionId: questions[14] ? questions[14].id : questions[4].id,
      correct: true,
      marksRatio: 1.0,
      timeTaken: 780,
    },
  ];

  let homework2Count = 0;
  for (const sub of homework2Submissions) {
    const question = questions.find((q) => q.id === sub.questionId);
    if (!question) continue;

    const awardedMarks = Math.round(
      (question.totalMarks || 0) * sub.marksRatio,
    );

    const beganAt = daysAgo(3);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student.id,
        questionId: sub.questionId,
        type: SubmissionType.Homework,
        status: SubmissionStatus.Graded,
        awardedMarks: awardedMarks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });

    // Add submission details
    if (question.solutionBases && question.solutionBases.length > 0) {
      const solutionBase = question.solutionBases[0];
      if (solutionBase.solutionMCQs.length > 0) {
        const correctOption = solutionBase.solutionMCQs.find(
          (mcq) => mcq.isCorrect,
        );
        const incorrectOption = solutionBase.solutionMCQs.find(
          (mcq) => !mcq.isCorrect,
        );
        const selectedOption = sub.correct ? correctOption : incorrectOption;

        await prisma.submittedMcq.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            submittedOption: selectedOption?.optionText || '',
            isCorrect: sub.correct,
            awardedMark: awardedMarks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: 'Well-structured homework solution',
            awardedMarks: awardedMarks,
          },
        });
      }
    }

    homework2Count++;
  }

  console.log(
    `   ✅ Created ${homework2Count} Homework submissions (Recent Assignment - 3 days ago)\n`,
  );

  // ==================== SUMMARY ====================
  const totalExam = examCount + exam2Count;
  const totalHomework = homeworkCount + homework2Count;
  const totalAdded = totalExam + totalHomework;

  console.log('='.repeat(60));
  console.log('🎉 SUBMISSION TYPES ADDED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary for ${student.fullName}:`);
  console.log(`   📝 Exam submissions added: ${totalExam}`);
  console.log(`   📚 Homework submissions added: ${totalHomework}`);
  console.log(`   📌 Total new submissions: ${totalAdded}`);
  console.log(
    '\n💡 Now you can see Exam and Homework data in performance reports!',
  );
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
