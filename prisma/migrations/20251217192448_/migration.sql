-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('Email', 'Google');

-- CreateEnum
CREATE TYPE "BoardName" AS ENUM ('AQA', 'Edexcel', 'Pearson_Edexcel', 'OCR');

-- CreateEnum
CREATE TYPE "AgeLevelName" AS ENUM ('A_Level', 'GCSE');

-- CreateEnum
CREATE TYPE "ContentBy" AS ENUM ('HUMAN', 'AI');

-- CreateEnum
CREATE TYPE "QuestionFor" AS ENUM ('Test', 'Practice');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('Scheduled', 'InProgress', 'InReview', 'Graded');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('Competitive', 'Normal', 'Mock');

-- CreateEnum
CREATE TYPE "ExamDifficulty" AS ENUM ('Easy', 'Medium', 'Hard');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auth" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "auth_provider" "AuthProvider",
    "clerk_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role_id" TEXT NOT NULL,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "last_updated_pass" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "board_age_level_id" TEXT,
    "country" TEXT,
    "currentStreak" INTEGER NOT NULL,
    "longestStreak" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardAgeLevel" (
    "id" TEXT NOT NULL,
    "board_name" "BoardName" NOT NULL,
    "age_level_name" "AgeLevelName" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BoardAgeLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_content_link" TEXT NOT NULL,
    "content_by" "ContentBy" NOT NULL DEFAULT 'HUMAN',
    "question_for" "QuestionFor" NOT NULL DEFAULT 'Practice',
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "total_marks" INTEGER,
    "time_limit" INTEGER,
    "hint" TEXT NOT NULL,
    "explanation" TEXT,
    "givenContext" TEXT,
    "findObjective" TEXT,
    "image_url" TEXT,
    "difficulty_level" "DifficultyLevel" NOT NULL DEFAULT 'Beginner',
    "step_count" INTEGER NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "question_type_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "subtopic_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBase" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionMcq" (
    "mcq_option_id" TEXT NOT NULL,
    "solution_base_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "mark" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SolutionMcq_pkey" PRIMARY KEY ("mcq_option_id")
);

-- CreateTable
CREATE TABLE "SolutionDescriptive" (
    "descriptive_id" TEXT NOT NULL,
    "solution_base_id" TEXT NOT NULL,
    "descriptive_solution" TEXT,
    "marking_steps_json" JSONB,
    "max_marks" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SolutionDescriptive_pkey" PRIMARY KEY ("descriptive_id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_file_name" TEXT,
    "serial_number" INTEGER NOT NULL,
    "paper_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtopics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_file_name" TEXT,
    "serial_number" INTEGER NOT NULL,
    "content" TEXT,
    "topic_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "type" "ExamType" NOT NULL,
    "difficulty" "ExamDifficulty",
    "time_limit" INTEGER,
    "max_number_of_questions" INTEGER,
    "status" "ReviewStatus",
    "total_marks" INTEGER,
    "class_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subtopics" (
    "exam_id" INTEGER NOT NULL,
    "topic_id" TEXT NOT NULL,
    "subtopic_id" TEXT NOT NULL,

    CONSTRAINT "exam_subtopics_pkey" PRIMARY KEY ("exam_id","topic_id","subtopic_id")
);

-- CreateTable
CREATE TABLE "question_sets" (
    "id" TEXT NOT NULL,
    "serial_id" INTEGER,
    "exam_id" INTEGER NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_email_key" ON "Auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_username_key" ON "Auth"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_clerk_id_key" ON "Auth"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_password_reset_token_key" ON "Auth"("password_reset_token");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_auth_id_key" ON "Guardian"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "Student_auth_id_key" ON "Student"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "BoardAgeLevel_board_name_age_level_name_key" ON "BoardAgeLevel"("board_name", "age_level_name");

-- CreateIndex
CREATE UNIQUE INDEX "question_types_name_key" ON "question_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBase_question_id_key" ON "SolutionBase"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionDescriptive_solution_base_id_key" ON "SolutionDescriptive"("solution_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_sets_exam_id_question_id_key" ON "question_sets"("exam_id", "question_id");

-- AddForeignKey
ALTER TABLE "Auth" ADD CONSTRAINT "Auth_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_board_age_level_id_fkey" FOREIGN KEY ("board_age_level_id") REFERENCES "BoardAgeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Auth"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_question_type_id_fkey" FOREIGN KEY ("question_type_id") REFERENCES "question_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBase" ADD CONSTRAINT "SolutionBase_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionMcq" ADD CONSTRAINT "SolutionMcq_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionDescriptive" ADD CONSTRAINT "SolutionDescriptive_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subtopics" ADD CONSTRAINT "exam_subtopics_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subtopics" ADD CONSTRAINT "exam_subtopics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subtopics" ADD CONSTRAINT "exam_subtopics_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
