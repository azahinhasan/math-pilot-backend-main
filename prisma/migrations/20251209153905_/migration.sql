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

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "created_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardAgeLevel" (
    "id" TEXT NOT NULL,
    "board_name" "BoardName" NOT NULL,
    "age_level_name" "AgeLevelName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question_content_link" TEXT NOT NULL,
    "content_by" "ContentBy" NOT NULL DEFAULT 'HUMAN',
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "total_marks" INTEGER,
    "hint" TEXT NOT NULL,
    "explanation" TEXT,
    "step_count" INTEGER NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "question_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution_base" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solution_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution_mcq" (
    "mcq_option_id" TEXT NOT NULL,
    "solution_base_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "mark" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "solution_mcq_pkey" PRIMARY KEY ("mcq_option_id")
);

-- CreateTable
CREATE TABLE "solution_descriptive" (
    "descriptive_id" TEXT NOT NULL,
    "solution_base_id" TEXT NOT NULL,
    "descriptive_solution" TEXT,
    "marking_steps_json" JSONB,
    "max_marks" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "solution_descriptive_pkey" PRIMARY KEY ("descriptive_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_email_key" ON "Auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_username_key" ON "Auth"("username");

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
CREATE UNIQUE INDEX "solution_base_question_id_key" ON "solution_base"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "solution_descriptive_solution_base_id_key" ON "solution_descriptive"("solution_base_id");

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
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_type_id_fkey" FOREIGN KEY ("question_type_id") REFERENCES "question_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_base" ADD CONSTRAINT "solution_base_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_mcq" ADD CONSTRAINT "solution_mcq_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "solution_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_descriptive" ADD CONSTRAINT "solution_descriptive_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "solution_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
