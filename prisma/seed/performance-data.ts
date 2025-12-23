import {
  PrismaClient,
  Subject,
  DifficultyLevel,
  ContentBy,
  QuestionFor,
  SubmissionType,
  SubmissionStatus,
  AuthProvider,
  Student,
  Module,
  Topic,
  Subtopic,
  Question,
  Submission,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive performance data seeding...');

  // ==================== STEP 0: Cleanup existing test data ====================
  console.log('\n🧹 Cleaning up existing test data...');

  // Delete in reverse order of dependencies
  const testEmails = [
    'student1@test.com',
    'student2@test.com',
    'student3@test.com',
    'guardian@test.com',
  ];

  // Get auth IDs for test users
  const testAuths = await prisma.auth.findMany({
    where: { email: { in: testEmails } },
    select: { id: true },
  });
  const testAuthIds = testAuths.map((a) => a.id);

  if (testAuthIds.length > 0) {
    // Delete student-related data
    await prisma.studentTopicDetails.deleteMany({
      where: { student: { authId: { in: testAuthIds } } },
    });

    await prisma.guardianStudentMap.deleteMany({
      where: {
        OR: [
          { student: { authId: { in: testAuthIds } } },
          { guardian: { authId: { in: testAuthIds } } },
        ],
      },
    });

    // Delete submissions and related data
    const submissions = await prisma.submission.findMany({
      where: { student: { authId: { in: testAuthIds } } },
      select: { id: true },
    });
    const submissionIds = submissions.map((s) => s.id);

    if (submissionIds.length > 0) {
      await prisma.submittedMatchingPair.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      await prisma.submittedDescriptive.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      await prisma.submittedMcq.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      await prisma.submittedAnswer.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
      await prisma.submission.deleteMany({
        where: { id: { in: submissionIds } },
      });
    }

    // Delete questions and solutions for test modules
    const testModules = await prisma.module.findMany({
      where: { name: { in: ['Algebra', 'Geometry', 'Number'] } },
      select: { id: true },
    });
    const testModuleIds = testModules.map((m) => m.id);

    if (testModuleIds.length > 0) {
      const questions = await prisma.question.findMany({
        where: { moduleId: { in: testModuleIds } },
        select: { id: true },
      });
      const questionIds = questions.map((q) => q.id);

      if (questionIds.length > 0) {
        const solutionBases = await prisma.solutionBase.findMany({
          where: { questionId: { in: questionIds } },
          select: { id: true },
        });
        const solutionBaseIds = solutionBases.map((s) => s.id);

        if (solutionBaseIds.length > 0) {
          await prisma.solutionMcq.deleteMany({
            where: { solutionBaseId: { in: solutionBaseIds } },
          });
          await prisma.solutionDescriptive.deleteMany({
            where: { solutionBaseId: { in: solutionBaseIds } },
          });
          await prisma.solutionMatchingPair.deleteMany({
            where: { solutionBaseId: { in: solutionBaseIds } },
          });
          await prisma.solutionBase.deleteMany({
            where: { id: { in: solutionBaseIds } },
          });
        }

        await prisma.activeCanvas.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await prisma.aiResponse.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await prisma.history.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await prisma.questionLevel.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await prisma.questionSet.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await prisma.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      }

      // Delete subtopics, topics, and modules
      await prisma.subtopic.deleteMany({
        where: { topic: { moduleId: { in: testModuleIds } } },
      });
      await prisma.topic.deleteMany({
        where: { moduleId: { in: testModuleIds } },
      });
      await prisma.studentSchedule.deleteMany({
        where: { moduleId: { in: testModuleIds } },
      });
      await prisma.module.deleteMany({
        where: { id: { in: testModuleIds } },
      });
    }

    // Delete students and guardians
    await prisma.student.deleteMany({
      where: { authId: { in: testAuthIds } },
    });
    await prisma.guardian.deleteMany({
      where: { authId: { in: testAuthIds } },
    });

    // Delete history and other auth-related data
    await prisma.history.deleteMany({
      where: { userId: { in: testAuthIds } },
    });
    await prisma.activeCanvas.deleteMany({
      where: { userId: { in: testAuthIds } },
    });
    await prisma.examLog.deleteMany({
      where: { userId: { in: testAuthIds } },
    });

    // Finally delete auth records
    await prisma.auth.deleteMany({
      where: { id: { in: testAuthIds } },
    });

    console.log(`✅ Cleaned up existing test data`);
  } else {
    console.log('✅ No existing test data found');
  }

  // ==================== STEP 1: Get existing reference data ====================
  console.log('\n📋 Fetching existing reference data...');

  const studentRole = await prisma.role.findUnique({
    where: { name: 'Student' },
  });

  const guardianRole = await prisma.role.findUnique({
    where: { name: 'Guardian' },
  });

  const boardAgeLevel = await prisma.boardAgeLevel.findFirst({
    where: {
      boardName: 'AQA',
      ageLevelName: 'GCSE',
    },
  });

  const mcqQuestionType = await prisma.questionType.findUnique({
    where: { name: 'MCQ' },
  });

  const descriptiveQuestionType = await prisma.questionType.findUnique({
    where: { name: 'Descriptive' },
  });

  if (
    !studentRole ||
    !boardAgeLevel ||
    !mcqQuestionType ||
    !descriptiveQuestionType
  ) {
    throw new Error(
      'Required reference data not found. Please run base seed first.',
    );
  }

  console.log('✅ Reference data loaded');

  // ==================== STEP 2: Create Auth & Students ====================
  console.log('\n👥 Creating test users...');

  const students: Student[] = [];

  // Student 1: High Performer
  const auth1 = await prisma.auth.create({
    data: {
      email: 'student1@test.com',
      username: 'high_performer',
      authProvider: AuthProvider.Email,
      isActive: true,
      roleId: studentRole.id,
    },
  });

  const student1 = await prisma.student.create({
    data: {
      fullName: 'Alice Johnson',
      authId: auth1.id,
      boardAgeLevelId: boardAgeLevel.id,
      country: 'United Kingdom',
      currentStreak: 15,
      longestStreak: 20,
      totalXp: 2500,
      lastActivity: new Date(),
    },
  });
  students.push(student1);
  console.log(`✅ Created student: ${student1.fullName} (${student1.id})`);

  // Student 2: Average Performer
  const auth2 = await prisma.auth.create({
    data: {
      email: 'student2@test.com',
      username: 'average_performer',
      authProvider: AuthProvider.Email,
      isActive: true,
      roleId: studentRole.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      fullName: 'Bob Smith',
      authId: auth2.id,
      boardAgeLevelId: boardAgeLevel.id,
      country: 'United Kingdom',
      currentStreak: 5,
      longestStreak: 8,
      totalXp: 1200,
      lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  });
  students.push(student2);
  console.log(`✅ Created student: ${student2.fullName} (${student2.id})`);

  // Student 3: Struggling Learner
  const auth3 = await prisma.auth.create({
    data: {
      email: 'student3@test.com',
      username: 'struggling_learner',
      authProvider: AuthProvider.Email,
      isActive: true,
      roleId: studentRole.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      fullName: 'Charlie Brown',
      authId: auth3.id,
      boardAgeLevelId: boardAgeLevel.id,
      country: 'United Kingdom',
      currentStreak: 2,
      longestStreak: 4,
      totalXp: 450,
      lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  });
  students.push(student3);
  console.log(`✅ Created student: ${student3.fullName} (${student3.id})`);

  // Optional: Create Guardian
  if (guardianRole) {
    const guardianAuth = await prisma.auth.create({
      data: {
        email: 'guardian@test.com',
        username: 'test_guardian',
        authProvider: AuthProvider.Email,
        isActive: true,
        roleId: guardianRole.id,
      },
    });

    const guardian = await prisma.guardian.create({
      data: {
        fullName: 'Parent Johnson',
        authId: guardianAuth.id,
      },
    });

    await prisma.guardianStudentMap.create({
      data: {
        guardianId: guardian.id,
        studentId: student1.id,
        relationship: 'Parent',
      },
    });

    console.log(`✅ Created guardian and linked to ${student1.fullName}`);
  }

  // ==================== STEP 3: Create Modules ====================
  console.log('\n📚 Creating modules...');

  const modules: Module[] = [];

  const algebraModule = await prisma.module.create({
    data: {
      name: 'Algebra',
      description: 'Core algebraic concepts and operations',
      boardAgeLevelId: boardAgeLevel.id,
      subject: Subject.Mathematics,
      formulaBookUrl: 'https://example.com/algebra-formulas.pdf',
    },
  });
  modules.push(algebraModule);
  console.log(`✅ Created module: ${algebraModule.name}`);

  const geometryModule = await prisma.module.create({
    data: {
      name: 'Geometry',
      description: 'Shapes, angles, and spatial reasoning',
      boardAgeLevelId: boardAgeLevel.id,
      subject: Subject.Mathematics,
      formulaBookUrl: 'https://example.com/geometry-formulas.pdf',
    },
  });
  modules.push(geometryModule);
  console.log(`✅ Created module: ${geometryModule.name}`);

  const numberModule = await prisma.module.create({
    data: {
      name: 'Number',
      description: 'Number operations and properties',
      boardAgeLevelId: boardAgeLevel.id,
      subject: Subject.Mathematics,
      formulaBookUrl: 'https://example.com/number-formulas.pdf',
    },
  });
  modules.push(numberModule);
  console.log(`✅ Created module: ${numberModule.name}`);

  // ==================== STEP 4: Create Topics ====================
  console.log('\n📖 Creating topics...');

  const topics: Topic[] = [];

  // Algebra Topics
  const linearEquationsTopic = await prisma.topic.create({
    data: {
      name: 'Linear Equations',
      description: 'Solving and graphing linear equations',
      moduleId: algebraModule.id,
      serialNumber: 1,
      paperNumber: 1,
    },
  });
  topics.push(linearEquationsTopic);

  const quadraticTopic = await prisma.topic.create({
    data: {
      name: 'Quadratic Equations',
      description: 'Solving quadratic equations using various methods',
      moduleId: algebraModule.id,
      serialNumber: 2,
      paperNumber: 1,
    },
  });
  topics.push(quadraticTopic);

  // Geometry Topics
  const anglesTopic = await prisma.topic.create({
    data: {
      name: 'Angles',
      description: 'Properties and calculations involving angles',
      moduleId: geometryModule.id,
      serialNumber: 1,
      paperNumber: 2,
    },
  });
  topics.push(anglesTopic);

  const trianglesTopic = await prisma.topic.create({
    data: {
      name: 'Triangles',
      description: 'Properties and theorems related to triangles',
      moduleId: geometryModule.id,
      serialNumber: 2,
      paperNumber: 2,
    },
  });
  topics.push(trianglesTopic);

  // Number Topics
  const fractionsTopic = await prisma.topic.create({
    data: {
      name: 'Fractions',
      description: 'Operations with fractions',
      moduleId: numberModule.id,
      serialNumber: 1,
      paperNumber: 1,
    },
  });
  topics.push(fractionsTopic);

  console.log(`✅ Created ${topics.length} topics`);

  // ==================== STEP 5: Create Subtopics ====================
  console.log('\n📑 Creating subtopics...');

  const subtopics: Subtopic[] = [];

  // Linear Equations Subtopics
  const solvingLinearSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Solving Linear Equations',
      topicId: linearEquationsTopic.id,
      serialNumber: 1,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Learn to solve equations of the form ax + b = c',
    },
  });
  subtopics.push(solvingLinearSubtopic);

  const graphingLinearSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Graphing Linear Equations',
      topicId: linearEquationsTopic.id,
      serialNumber: 2,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Plot linear equations on a coordinate plane',
    },
  });
  subtopics.push(graphingLinearSubtopic);

  // Quadratic Subtopics
  const factoringSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Factoring Quadratics',
      topicId: quadraticTopic.id,
      serialNumber: 1,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Factor quadratic expressions',
    },
  });
  subtopics.push(factoringSubtopic);

  const quadraticFormulaSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Quadratic Formula',
      topicId: quadraticTopic.id,
      serialNumber: 2,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Use the quadratic formula to solve equations',
    },
  });
  subtopics.push(quadraticFormulaSubtopic);

  // Angles Subtopics
  const anglesLinesSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Angles on Parallel Lines',
      topicId: anglesTopic.id,
      serialNumber: 1,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Corresponding, alternate, and co-interior angles',
    },
  });
  subtopics.push(anglesLinesSubtopic);

  // Triangles Subtopics
  const pythagorasSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Pythagoras Theorem',
      topicId: trianglesTopic.id,
      serialNumber: 1,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Apply Pythagoras theorem to right-angled triangles',
    },
  });
  subtopics.push(pythagorasSubtopic);

  // Fractions Subtopics
  const addingFractionsSubtopic = await prisma.subtopic.create({
    data: {
      name: 'Adding and Subtracting Fractions',
      topicId: fractionsTopic.id,
      serialNumber: 1,
      boardAgeLevelId: boardAgeLevel.id,
      content: 'Add and subtract fractions with different denominators',
    },
  });
  subtopics.push(addingFractionsSubtopic);

  console.log(`✅ Created ${subtopics.length} subtopics`);

  // ==================== STEP 6: Create Questions with Solutions ====================
  console.log('\n❓ Creating questions with solutions...');

  const questions: Question[] = [];

  // Question 1: MCQ - Easy - Linear Equations
  const q1 = await prisma.question.create({
    data: {
      name: 'Solve for x: 2x + 5 = 13',
      questionText: 'Solve the equation: 2x + 5 = 13',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 2,
      timeLimit: 60,
      hint: 'Subtract 5 from both sides first',
      stepCount: 2,
      serialNo: 1,
      difficulty_level: DifficultyLevel.Easy,
      questionTypeId: mcqQuestionType.id,
      moduleId: algebraModule.id,
      topicId: linearEquationsTopic.id,
      subtopicId: solvingLinearSubtopic.id,
      solutionBases: {
        create: {
          solutionMCQs: {
            createMany: {
              data: [
                { optionText: 'x = 4', isCorrect: true, mark: 2 },
                { optionText: 'x = 8', isCorrect: false, mark: 0 },
                { optionText: 'x = 9', isCorrect: false, mark: 0 },
                { optionText: 'x = 3', isCorrect: false, mark: 0 },
              ],
            },
          },
        },
      },
    },
  });
  questions.push(q1);

  // Question 2: MCQ - Easy - Fractions
  const q2 = await prisma.question.create({
    data: {
      name: 'What is 1/2 + 1/4?',
      questionText: 'Calculate: 1/2 + 1/4',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 2,
      timeLimit: 90,
      hint: 'Find a common denominator',
      stepCount: 2,
      serialNo: 2,
      difficulty_level: DifficultyLevel.Easy,
      questionTypeId: mcqQuestionType.id,
      moduleId: numberModule.id,
      topicId: fractionsTopic.id,
      subtopicId: addingFractionsSubtopic.id,
      solutionBases: {
        create: {
          solutionMCQs: {
            createMany: {
              data: [
                { optionText: '3/4', isCorrect: true, mark: 2 },
                { optionText: '2/6', isCorrect: false, mark: 0 },
                { optionText: '1/2', isCorrect: false, mark: 0 },
                { optionText: '2/4', isCorrect: false, mark: 0 },
              ],
            },
          },
        },
      },
    },
  });
  questions.push(q2);

  // Question 3: Descriptive - Medium - Quadratic
  const q3 = await prisma.question.create({
    data: {
      name: 'Solve: x^2 - 5x + 6 = 0',
      questionText:
        'Solve the quadratic equation by factoring: x^2 - 5x + 6 = 0',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 4,
      timeLimit: 180,
      hint: 'Factor into (x - a)(x - b) = 0',
      explanation: 'Factor as (x - 2)(x - 3) = 0, so x = 2 or x = 3',
      stepCount: 3,
      serialNo: 3,
      difficulty_level: DifficultyLevel.Medium,
      questionTypeId: descriptiveQuestionType.id,
      moduleId: algebraModule.id,
      topicId: quadraticTopic.id,
      subtopicId: factoringSubtopic.id,
      solutionBases: {
        create: {
          solutionDescriptives: {
            create: {
              descriptiveSolution: 'x = 2 or x = 3',
              maxMarks: 4,
              markingStepsJson: {
                steps: [
                  {
                    description: 'Correct factorization: (x-2)(x-3)=0',
                    marks: 2,
                  },
                  { description: 'Both solutions identified', marks: 2 },
                ],
              },
            },
          },
        },
      },
    },
  });
  questions.push(q3);

  // Question 4: MCQ - Medium - Angles
  const q4 = await prisma.question.create({
    data: {
      name: 'Corresponding angles with parallel lines',
      questionText:
        'Two parallel lines are cut by a transversal. If one angle is 65 degrees, what is the corresponding angle?',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 2,
      timeLimit: 90,
      hint: 'Corresponding angles are equal',
      stepCount: 1,
      serialNo: 4,
      difficulty_level: DifficultyLevel.Medium,
      questionTypeId: mcqQuestionType.id,
      moduleId: geometryModule.id,
      topicId: anglesTopic.id,
      subtopicId: anglesLinesSubtopic.id,
      solutionBases: {
        create: {
          solutionMCQs: {
            createMany: {
              data: [
                { optionText: '65 degrees', isCorrect: true, mark: 2 },
                { optionText: '115 degrees', isCorrect: false, mark: 0 },
                { optionText: '25 degrees', isCorrect: false, mark: 0 },
                { optionText: '90 degrees', isCorrect: false, mark: 0 },
              ],
            },
          },
        },
      },
    },
  });
  questions.push(q4);

  // Question 5: Descriptive - Hard - Pythagoras
  const q5 = await prisma.question.create({
    data: {
      name: 'Apply Pythagoras Theorem',
      questionText:
        'A right-angled triangle has sides of 5cm and 12cm. Calculate the hypotenuse.',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 5,
      timeLimit: 240,
      hint: 'Use a^2 + b^2 = c^2',
      explanation: '5^2 + 12^2 = 25 + 144 = 169, so c = sqrt(169) = 13cm',
      stepCount: 4,
      serialNo: 5,
      difficulty_level: DifficultyLevel.Hard,
      questionTypeId: descriptiveQuestionType.id,
      moduleId: geometryModule.id,
      topicId: trianglesTopic.id,
      subtopicId: pythagorasSubtopic.id,
      solutionBases: {
        create: {
          solutionDescriptives: {
            create: {
              descriptiveSolution: '13 cm',
              maxMarks: 5,
              markingStepsJson: {
                steps: [
                  { description: 'Correct formula stated', marks: 1 },
                  { description: 'Values substituted correctly', marks: 1 },
                  { description: 'Calculation: 25 + 144 = 169', marks: 2 },
                  { description: 'Final answer with unit', marks: 1 },
                ],
              },
            },
          },
        },
      },
    },
  });
  questions.push(q5);

  // Question 6: MCQ - Easy - Linear graphing
  const q6 = await prisma.question.create({
    data: {
      name: 'Identify y-intercept',
      questionText: 'What is the y-intercept of the line y = 2x + 3?',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 1,
      timeLimit: 60,
      hint: 'The y-intercept is the constant term',
      stepCount: 1,
      serialNo: 6,
      difficulty_level: DifficultyLevel.Easy,
      questionTypeId: mcqQuestionType.id,
      moduleId: algebraModule.id,
      topicId: linearEquationsTopic.id,
      subtopicId: graphingLinearSubtopic.id,
      solutionBases: {
        create: {
          solutionMCQs: {
            createMany: {
              data: [
                { optionText: '3', isCorrect: true, mark: 1 },
                { optionText: '2', isCorrect: false, mark: 0 },
                { optionText: '0', isCorrect: false, mark: 0 },
                { optionText: '5', isCorrect: false, mark: 0 },
              ],
            },
          },
        },
      },
    },
  });
  questions.push(q6);

  // Question 7: MCQ - Medium - Quadratic Formula
  const q7 = await prisma.question.create({
    data: {
      name: 'Quadratic Formula Application',
      questionText:
        'Using the quadratic formula, how many solutions does x^2 - 4x + 4 = 0 have?',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 3,
      timeLimit: 150,
      hint: 'Check the discriminant b^2 - 4ac',
      stepCount: 2,
      serialNo: 7,
      difficulty_level: DifficultyLevel.Medium,
      questionTypeId: mcqQuestionType.id,
      moduleId: algebraModule.id,
      topicId: quadraticTopic.id,
      subtopicId: quadraticFormulaSubtopic.id,
      solutionBases: {
        create: {
          solutionMCQs: {
            createMany: {
              data: [
                {
                  optionText: 'One repeated solution',
                  isCorrect: true,
                  mark: 3,
                },
                {
                  optionText: 'Two distinct solutions',
                  isCorrect: false,
                  mark: 0,
                },
                { optionText: 'No real solutions', isCorrect: false, mark: 0 },
                { optionText: 'Infinite solutions', isCorrect: false, mark: 0 },
              ],
            },
          },
        },
      },
    },
  });
  questions.push(q7);

  // Question 8: Descriptive - Easy - Linear solving
  const q8 = await prisma.question.create({
    data: {
      name: 'Simple linear equation',
      questionText: 'Solve for x: 3x = 15',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 2,
      timeLimit: 60,
      hint: 'Divide both sides by 3',
      stepCount: 1,
      serialNo: 8,
      difficulty_level: DifficultyLevel.Easy,
      questionTypeId: descriptiveQuestionType.id,
      moduleId: algebraModule.id,
      topicId: linearEquationsTopic.id,
      subtopicId: solvingLinearSubtopic.id,
      solutionBases: {
        create: {
          solutionDescriptives: {
            create: {
              descriptiveSolution: 'x = 5',
              maxMarks: 2,
              markingStepsJson: {
                steps: [
                  { description: 'Correct operation', marks: 1 },
                  { description: 'Correct answer', marks: 1 },
                ],
              },
            },
          },
        },
      },
    },
  });
  questions.push(q8);

  // Question 9: MCQ - Hard - Angles
  const q9 = await prisma.question.create({
    data: {
      name: 'Complex angle problem',
      questionText:
        'In a triangle, if two angles are 45 degrees and 65 degrees, what is the third angle?',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 3,
      timeLimit: 120,
      hint: 'Sum of angles in a triangle is 180 degrees',
      stepCount: 2,
      serialNo: 9,
      difficulty_level: DifficultyLevel.Hard,
      questionTypeId: mcqQuestionType.id,
      moduleId: geometryModule.id,
      topicId: trianglesTopic.id,
      subtopicId: pythagorasSubtopic.id,
      solutionBases: {
        create: {
          solutionMCQs: {
            createMany: {
              data: [
                { optionText: '70 degrees', isCorrect: true, mark: 3 },
                { optionText: '80 degrees', isCorrect: false, mark: 0 },
                { optionText: '90 degrees', isCorrect: false, mark: 0 },
                { optionText: '110 degrees', isCorrect: false, mark: 0 },
              ],
            },
          },
        },
      },
    },
  });
  questions.push(q9);

  // Question 10: Descriptive - Hard - Quadratic
  const q10 = await prisma.question.create({
    data: {
      name: 'Quadratic word problem',
      questionText:
        'A rectangle has a length that is 3cm more than its width. If the area is 40cm^2, find the dimensions.',
      questionContentLink: '',
      contentBy: ContentBy.Human,
      questionFor: QuestionFor.Practice,
      totalMarks: 6,
      timeLimit: 300,
      hint: 'Let width = x, then length = x + 3. Area = x(x + 3) = 40',
      explanation:
        'x^2 + 3x - 40 = 0, factor to (x+8)(x-5)=0, so x=5 (reject negative). Width=5cm, Length=8cm',
      stepCount: 5,
      serialNo: 10,
      difficulty_level: DifficultyLevel.Hard,
      questionTypeId: descriptiveQuestionType.id,
      moduleId: algebraModule.id,
      topicId: quadraticTopic.id,
      subtopicId: factoringSubtopic.id,
      solutionBases: {
        create: {
          solutionDescriptives: {
            create: {
              descriptiveSolution: 'Width = 5cm, Length = 8cm',
              maxMarks: 6,
              markingStepsJson: {
                steps: [
                  { description: 'Set up equation correctly', marks: 2 },
                  { description: 'Expand and rearrange', marks: 1 },
                  { description: 'Solve quadratic', marks: 2 },
                  { description: 'State both dimensions with units', marks: 1 },
                ],
              },
            },
          },
        },
      },
    },
  });
  questions.push(q10);

  console.log(`✅ Created ${questions.length} questions with solutions`);

  // ==================== STEP 7: Create Submissions ====================
  console.log('\n📝 Creating submissions for performance analysis...');

  const now = new Date();
  const submissions: Submission[] = [];

  // Helper function to create date in the past
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const addSeconds = (date: Date, seconds: number): Date => {
    return new Date(date.getTime() + seconds * 1000);
  };

  // Student 1 (High Performer) - Mostly correct answers
  const student1Submissions = [
    // Easy questions - all correct
    {
      questionId: q1.id,
      daysBack: 10,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 45,
    },
    {
      questionId: q2.id,
      daysBack: 9,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 60,
    },
    {
      questionId: q6.id,
      daysBack: 8,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 30,
    },
    {
      questionId: q8.id,
      daysBack: 7,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 40,
    },

    // Medium questions - mostly correct
    {
      questionId: q3.id,
      daysBack: 6,
      correct: true,
      marks: 4,
      totalMarks: 4,
      timeTaken: 150,
    },
    {
      questionId: q4.id,
      daysBack: 5,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 70,
    },
    {
      questionId: q7.id,
      daysBack: 4,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 120,
    },

    // Hard questions - some correct
    {
      questionId: q5.id,
      daysBack: 3,
      correct: true,
      marks: 5,
      totalMarks: 5,
      timeTaken: 200,
    },
    {
      questionId: q9.id,
      daysBack: 2,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 90,
    },
    {
      questionId: q10.id,
      daysBack: 1,
      correct: false,
      marks: 4,
      totalMarks: 6,
      timeTaken: 280,
    },
  ];

  for (const sub of student1Submissions) {
    const beganAt = daysAgo(sub.daysBack);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student1.id,
        questionId: sub.questionId,
        type: SubmissionType.Practice,
        status: SubmissionStatus.Graded,
        awardedMarks: sub.marks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });
    submissions.push(submission);

    // Get solution base for this question
    const solutionBase = await prisma.solutionBase.findUnique({
      where: { questionId: sub.questionId },
      include: { solutionMCQs: true, solutionDescriptives: true },
    });

    if (solutionBase) {
      // Create submitted answer
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
            awardedMark: sub.marks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        // Descriptive submission
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Correct solution provided'
              : 'Partially correct solution',
            awardedMarks: sub.marks,
            canvasJson:""
          },
        });
      }
    }
  }

  console.log(
    `✅ Created ${student1Submissions.length} submissions for ${student1.fullName}`,
  );

  // ==================== STEP 7B: Create EXAM submissions for Alice (test performance tracking) ====================
  console.log(
    '\n🎓 Creating EXAM (Test Mode) submissions for performance tracking...',
  );

  // Alice - Test submissions over the past 30 days with varied performance
  const student1ExamSubmissions = [
    // Day 30 - Starting strong
    {
      questionId: q1.id,
      daysBack: 30,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 40,
    },
    // Day 29
    {
      questionId: q2.id,
      daysBack: 29,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 55,
    },
    // Day 28
    {
      questionId: q6.id,
      daysBack: 28,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 25,
    },
    // Day 27
    {
      questionId: q8.id,
      daysBack: 27,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 35,
    },
    // Day 26
    {
      questionId: q1.id,
      daysBack: 26,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 38,
    },
    // Day 25 - Medium difficulty starts
    {
      questionId: q4.id,
      daysBack: 25,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 65,
    },
    // Day 24
    {
      questionId: q2.id,
      daysBack: 24,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 50,
    },
    // Day 23
    {
      questionId: q3.id,
      daysBack: 23,
      correct: true,
      marks: 4,
      totalMarks: 4,
      timeTaken: 140,
    },
    // Day 22
    {
      questionId: q7.id,
      daysBack: 22,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 110,
    },
    // Day 21
    {
      questionId: q6.id,
      daysBack: 21,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 28,
    },
    // Day 20 - Hard questions appear
    {
      questionId: q5.id,
      daysBack: 20,
      correct: true,
      marks: 5,
      totalMarks: 5,
      timeTaken: 190,
    },
    // Day 19
    {
      questionId: q1.id,
      daysBack: 19,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 42,
    },
    // Day 18
    {
      questionId: q4.id,
      daysBack: 18,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 70,
    },
    // Day 17
    {
      questionId: q9.id,
      daysBack: 17,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 85,
    },
    // Day 16
    {
      questionId: q3.id,
      daysBack: 16,
      correct: true,
      marks: 4,
      totalMarks: 4,
      timeTaken: 135,
    },
    // Day 15 - Perfect day
    {
      questionId: q2.id,
      daysBack: 15,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 48,
    },
    {
      questionId: q6.id,
      daysBack: 15,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 30,
    },
    {
      questionId: q8.id,
      daysBack: 15,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 38,
    },
    // Day 14
    {
      questionId: q7.id,
      daysBack: 14,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 105,
    },
    // Day 13
    {
      questionId: q1.id,
      daysBack: 13,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 35,
    },
    // Day 12
    {
      questionId: q5.id,
      daysBack: 12,
      correct: true,
      marks: 5,
      totalMarks: 5,
      timeTaken: 200,
    },
    // Day 11
    {
      questionId: q4.id,
      daysBack: 11,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 68,
    },
    // Day 10 - Starting to make mistakes
    {
      questionId: q10.id,
      daysBack: 10,
      correct: false,
      marks: 3,
      totalMarks: 6,
      timeTaken: 290,
    },
    // Day 9
    {
      questionId: q2.id,
      daysBack: 9,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 52,
    },
    // Day 8
    {
      questionId: q3.id,
      daysBack: 8,
      correct: true,
      marks: 4,
      totalMarks: 4,
      timeTaken: 145,
    },
    // Day 7
    {
      questionId: q9.id,
      daysBack: 7,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 120,
    },
    // Day 6
    {
      questionId: q6.id,
      daysBack: 6,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 32,
    },
    // Day 5
    {
      questionId: q1.id,
      daysBack: 5,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 40,
    },
    // Day 4
    {
      questionId: q7.id,
      daysBack: 4,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 115,
    },
    // Day 3
    {
      questionId: q5.id,
      daysBack: 3,
      correct: true,
      marks: 5,
      totalMarks: 5,
      timeTaken: 185,
    },
    // Day 2
    {
      questionId: q4.id,
      daysBack: 2,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 72,
    },
    // Day 1 - Recent performance
    {
      questionId: q2.id,
      daysBack: 1,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 45,
    },
    {
      questionId: q8.id,
      daysBack: 1,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 37,
    },
    // Today
    {
      questionId: q10.id,
      daysBack: 0,
      correct: true,
      marks: 6,
      totalMarks: 6,
      timeTaken: 270,
    },
  ];

  for (const sub of student1ExamSubmissions) {
    const beganAt = daysAgo(sub.daysBack);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student1.id,
        questionId: sub.questionId,
        type: SubmissionType.Exam, // EXAM TYPE FOR TEST PERFORMANCE
        status: SubmissionStatus.Graded,
        awardedMarks: sub.marks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });
    submissions.push(submission);

    // Get solution base for this question
    const solutionBase = await prisma.solutionBase.findUnique({
      where: { questionId: sub.questionId },
      include: { solutionMCQs: true, solutionDescriptives: true },
    });

    if (solutionBase) {
      // Create submitted answer
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
            awardedMark: sub.marks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        // Descriptive submission
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Correct solution provided'
              : 'Partially correct solution',
            awardedMarks: sub.marks,
            canvasJson:""
          },
        });
      }
    }
  }

  console.log(
    `✅ Created ${student1ExamSubmissions.length} EXAM submissions for ${student1.fullName} (Test Mode)`,
  );

  // Student 2 (Average Performer) - Mixed performance
  const student2Submissions = [
    // Easy questions - mostly correct
    {
      questionId: q1.id,
      daysBack: 12,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 55,
    },
    {
      questionId: q2.id,
      daysBack: 11,
      correct: false,
      marks: 0,
      totalMarks: 2,
      timeTaken: 100,
    },
    {
      questionId: q6.id,
      daysBack: 10,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 45,
    },
    {
      questionId: q8.id,
      daysBack: 9,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 50,
    },

    // Medium questions - about half correct
    {
      questionId: q3.id,
      daysBack: 8,
      correct: false,
      marks: 2,
      totalMarks: 4,
      timeTaken: 180,
    },
    {
      questionId: q4.id,
      daysBack: 7,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 85,
    },
    {
      questionId: q7.id,
      daysBack: 6,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 170,
    },

    // Hard questions - struggling
    {
      questionId: q5.id,
      daysBack: 5,
      correct: false,
      marks: 2,
      totalMarks: 5,
      timeTaken: 240,
    },
    {
      questionId: q9.id,
      daysBack: 4,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 110,
    },
    {
      questionId: q10.id,
      daysBack: 3,
      correct: false,
      marks: 1,
      totalMarks: 6,
      timeTaken: 300,
    },
  ];

  for (const sub of student2Submissions) {
    const beganAt = daysAgo(sub.daysBack);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student2.id,
        questionId: sub.questionId,
        type: SubmissionType.Practice,
        status: SubmissionStatus.Graded,
        awardedMarks: sub.marks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });
    submissions.push(submission);

    const solutionBase = await prisma.solutionBase.findUnique({
      where: { questionId: sub.questionId },
      include: { solutionMCQs: true, solutionDescriptives: true },
    });

    if (solutionBase) {
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
            awardedMark: sub.marks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Correct answer'
              : 'Incorrect attempt',
            awardedMarks: sub.marks,
            canvasJson:""
          },
        });
      }
    }
  }

  console.log(
    `✅ Created ${student2Submissions.length} submissions for ${student2.fullName}`,
  );

  // Bob - Test submissions over the past 30 days with average performance
  const student2ExamSubmissions = [
    // Day 30
    {
      questionId: q1.id,
      daysBack: 30,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 50,
    },
    // Day 29
    {
      questionId: q2.id,
      daysBack: 29,
      correct: false,
      marks: 0,
      totalMarks: 2,
      timeTaken: 95,
    },
    // Day 27
    {
      questionId: q6.id,
      daysBack: 27,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 40,
    },
    // Day 26
    {
      questionId: q8.id,
      daysBack: 26,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 55,
    },
    // Day 24
    {
      questionId: q1.id,
      daysBack: 24,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 48,
    },
    // Day 23
    {
      questionId: q4.id,
      daysBack: 23,
      correct: false,
      marks: 0,
      totalMarks: 2,
      timeTaken: 100,
    },
    // Day 22
    {
      questionId: q2.id,
      daysBack: 22,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 60,
    },
    // Day 20
    {
      questionId: q3.id,
      daysBack: 20,
      correct: false,
      marks: 2,
      totalMarks: 4,
      timeTaken: 175,
    },
    // Day 19
    {
      questionId: q7.id,
      daysBack: 19,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 130,
    },
    // Day 18
    {
      questionId: q6.id,
      daysBack: 18,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 38,
    },
    // Day 16
    {
      questionId: q5.id,
      daysBack: 16,
      correct: false,
      marks: 2,
      totalMarks: 5,
      timeTaken: 230,
    },
    // Day 15
    {
      questionId: q1.id,
      daysBack: 15,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 52,
    },
    // Day 14
    {
      questionId: q4.id,
      daysBack: 14,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 75,
    },
    // Day 13
    {
      questionId: q9.id,
      daysBack: 13,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 115,
    },
    // Day 12
    {
      questionId: q3.id,
      daysBack: 12,
      correct: true,
      marks: 4,
      totalMarks: 4,
      timeTaken: 165,
    },
    // Day 11
    {
      questionId: q2.id,
      daysBack: 11,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 58,
    },
    // Day 10
    {
      questionId: q10.id,
      daysBack: 10,
      correct: false,
      marks: 2,
      totalMarks: 6,
      timeTaken: 290,
    },
    // Day 9
    {
      questionId: q6.id,
      daysBack: 9,
      correct: true,
      marks: 1,
      totalMarks: 1,
      timeTaken: 35,
    },
    // Day 8
    {
      questionId: q8.id,
      daysBack: 8,
      correct: false,
      marks: 1,
      totalMarks: 2,
      timeTaken: 70,
    },
    // Day 7
    {
      questionId: q7.id,
      daysBack: 7,
      correct: true,
      marks: 3,
      totalMarks: 3,
      timeTaken: 140,
    },
    // Day 6
    {
      questionId: q1.id,
      daysBack: 6,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 45,
    },
    // Day 5
    {
      questionId: q5.id,
      daysBack: 5,
      correct: false,
      marks: 3,
      totalMarks: 5,
      timeTaken: 240,
    },
    // Day 4
    {
      questionId: q4.id,
      daysBack: 4,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 78,
    },
    // Day 3
    {
      questionId: q2.id,
      daysBack: 3,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 62,
    },
    // Day 2
    {
      questionId: q9.id,
      daysBack: 2,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 120,
    },
    // Day 1
    {
      questionId: q3.id,
      daysBack: 1,
      correct: true,
      marks: 4,
      totalMarks: 4,
      timeTaken: 155,
    },
  ];

  for (const sub of student2ExamSubmissions) {
    const beganAt = daysAgo(sub.daysBack);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student2.id,
        questionId: sub.questionId,
        type: SubmissionType.Exam,
        status: SubmissionStatus.Graded,
        awardedMarks: sub.marks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });
    submissions.push(submission);

    const solutionBase = await prisma.solutionBase.findUnique({
      where: { questionId: sub.questionId },
      include: { solutionMCQs: true, solutionDescriptives: true },
    });

    if (solutionBase) {
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
            awardedMark: sub.marks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: sub.correct
              ? 'Correct answer'
              : 'Incorrect attempt',
            awardedMarks: sub.marks,
            canvasJson:""
          },
        });
      }
    }
  }

  console.log(
    `✅ Created ${student2ExamSubmissions.length} EXAM submissions for ${student2.fullName} (Test Mode)`,
  );

  // Student 3 (Struggling Learner) - Mostly incorrect
  const student3Submissions = [
    // Easy questions - some correct
    {
      questionId: q1.id,
      daysBack: 15,
      correct: false,
      marks: 0,
      totalMarks: 2,
      timeTaken: 70,
    },
    {
      questionId: q2.id,
      daysBack: 14,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 110,
    },
    {
      questionId: q6.id,
      daysBack: 13,
      correct: false,
      marks: 0,
      totalMarks: 1,
      timeTaken: 80,
    },
    {
      questionId: q8.id,
      daysBack: 12,
      correct: true,
      marks: 2,
      totalMarks: 2,
      timeTaken: 65,
    },

    // Medium questions - mostly incorrect
    {
      questionId: q3.id,
      daysBack: 11,
      correct: false,
      marks: 1,
      totalMarks: 4,
      timeTaken: 200,
    },
    {
      questionId: q4.id,
      daysBack: 10,
      correct: false,
      marks: 0,
      totalMarks: 2,
      timeTaken: 100,
    },
    {
      questionId: q7.id,
      daysBack: 9,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 180,
    },

    // Hard questions - all incorrect
    {
      questionId: q5.id,
      daysBack: 8,
      correct: false,
      marks: 0,
      totalMarks: 5,
      timeTaken: 250,
    },
    {
      questionId: q9.id,
      daysBack: 7,
      correct: false,
      marks: 0,
      totalMarks: 3,
      timeTaken: 130,
    },
    {
      questionId: q10.id,
      daysBack: 6,
      correct: false,
      marks: 0,
      totalMarks: 6,
      timeTaken: 300,
    },
  ];

  for (const sub of student3Submissions) {
    const beganAt = daysAgo(sub.daysBack);
    const endedAt = addSeconds(beganAt, sub.timeTaken);

    const submission = await prisma.submission.create({
      data: {
        studentId: student3.id,
        questionId: sub.questionId,
        type: SubmissionType.Practice,
        status: SubmissionStatus.Graded,
        awardedMarks: sub.marks,
        correctAnswersCount: sub.correct ? 1 : 0,
        beganAt: beganAt,
        endedAt: endedAt,
      },
    });
    submissions.push(submission);

    const solutionBase = await prisma.solutionBase.findUnique({
      where: { questionId: sub.questionId },
      include: { solutionMCQs: true, solutionDescriptives: true },
    });

    if (solutionBase) {
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
            awardedMark: sub.marks,
          },
        });
      } else if (solutionBase.solutionDescriptives.length > 0) {
        await prisma.submittedDescriptive.create({
          data: {
            submissionId: submission.id,
            solutionId: solutionBase.id,
            descriptiveSubmittedAnswer: 'Attempted solution',
            awardedMarks: sub.marks,
            canvasJson:""
          },
        });
      }
    }
  }

  console.log(
    `✅ Created ${student3Submissions.length} submissions for ${student3.fullName}`,
  );

  // ==================== STEP 8: Create StudentTopicProgress ====================
  console.log('\n📊 Creating student topic progress records...');

  // Student 1 Topic Progress (High Performer - Should have completed topics)
  await prisma.studentTopicDetails.create({
    data: {
      studentId: student1.id,
      topicId: linearEquationsTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 15,      // Increased for completion
      questionsCorrect: 14,         // 93% accuracy
      timeSpentInSeconds: 900,
      lastAccessedAt: daysAgo(1),
    },
  });

  await prisma.studentTopicDetails.create({
    data: {
      studentId: student1.id,
      topicId: quadraticTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 12,      // Increased for completion
      questionsCorrect: 10,         // 83% accuracy
      timeSpentInSeconds: 1850,
      isFavorite: true,
      lastAccessedAt: daysAgo(1),
    },
  });

  await prisma.studentTopicDetails.create({
    data: {
      studentId: student1.id,
      topicId: trianglesTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 10,      // Exactly at minimum
      questionsCorrect: 9,          // 90% accuracy
      timeSpentInSeconds: 720,
      lastAccessedAt: daysAgo(2),
    },
  });

  // Add more topics for Alice to increase coverage
  await prisma.studentTopicDetails.create({
    data: {
      studentId: student1.id,
      topicId: anglesTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 7,       // In progress
      questionsCorrect: 6,          // 86% accuracy
      timeSpentInSeconds: 420,
      lastAccessedAt: daysAgo(3),
    },
  });

  // Student 2 Topic Progress (Average Performer - Mixed completion)
  await prisma.studentTopicDetails.create({
    data: {
      studentId: student2.id,
      topicId: linearEquationsTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 12,      // Enough attempts
      questionsCorrect: 9,          // 75% accuracy - just completed!
      timeSpentInSeconds: 950,
      lastAccessedAt: daysAgo(3),
    },
  });

  await prisma.studentTopicDetails.create({
    data: {
      studentId: student2.id,
      topicId: quadraticTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 10,      // At minimum
      questionsCorrect: 5,          // 50% accuracy - not completed
      timeSpentInSeconds: 1471,
      isFavorite: true,
      lastAccessedAt: daysAgo(3),
    },
  });

  await prisma.studentTopicDetails.create({
    data: {
      studentId: student2.id,
      topicId: anglesTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 8,       // In progress
      questionsCorrect: 4,          // 50% accuracy
      timeSpentInSeconds: 650,
      lastAccessedAt: daysAgo(4),
    },
  });

  // Student 3 Topic Progress (Struggling Learner - Low completion, low accuracy)
  await prisma.studentTopicDetails.create({
    data: {
      studentId: student3.id,
      topicId: linearEquationsTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 10,      // Enough attempts
      questionsCorrect: 3,          // 30% accuracy - not completed
      timeSpentInSeconds: 1215,
      lastAccessedAt: daysAgo(6),
    },
  });

  await prisma.studentTopicDetails.create({
    data: {
      studentId: student3.id,
      topicId: quadraticTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 8,       // In progress
      questionsCorrect: 1,          // 12.5% accuracy - struggling
      timeSpentInSeconds: 1380,
      lastAccessedAt: daysAgo(9),
    },
  });

  await prisma.studentTopicDetails.create({
    data: {
      studentId: student3.id,
      topicId: anglesTopic.id,
      status: SubmissionStatus.Graded,
      questionsAttempted: 5,       // Few attempts
      questionsCorrect: 1,          // 20% accuracy
      timeSpentInSeconds: 520,
      lastAccessedAt: daysAgo(10),
    },
  });

  console.log('✅ Created student topic progress records');

  // ==================== Summary ====================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📊 Data Summary:');
  console.log(`   👥 Students: ${students.length}`);
  console.log(`   📚 Modules: ${modules.length}`);
  console.log(`   📖 Topics: ${topics.length}`);
  console.log(`   📑 Subtopics: ${subtopics.length}`);
  console.log(`   ❓ Questions: ${questions.length}`);
  console.log(`   📝 Total Submissions: ${submissions.length}`);
  console.log('\n🧪 Test Student Accounts:');
  console.log(`   1. ${student1.fullName} (${student1.id})`);
  console.log(`      Email: student1@test.com | Performance: High`);
  console.log(`   2. ${student2.fullName} (${student2.id})`);
  console.log(`      Email: student2@test.com | Performance: Average`);
  console.log(`   3. ${student3.fullName} (${student3.id})`);
  console.log(`      Email: student3@test.com | Performance: Struggling`);
  console.log('\n✨ Ready for Performance Analysis API testing!');
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
