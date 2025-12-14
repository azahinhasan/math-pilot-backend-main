/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `BoardAgeLevel` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BoardAgeLevel` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Guardian` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Guardian` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `solution_base` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `solution_descriptive` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `solution_mcq` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clerk_id]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `Auth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `BoardAgeLevel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Guardian` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_question_type_id_fkey";

-- DropForeignKey
ALTER TABLE "solution_base" DROP CONSTRAINT "solution_base_question_id_fkey";

-- DropForeignKey
ALTER TABLE "solution_descriptive" DROP CONSTRAINT "solution_descriptive_solution_base_id_fkey";

-- DropForeignKey
ALTER TABLE "solution_mcq" DROP CONSTRAINT "solution_mcq_solution_base_id_fkey";

-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "BoardAgeLevel" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Guardian" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "questions";

-- DropTable
DROP TABLE "solution_base";

-- DropTable
DROP TABLE "solution_descriptive";

-- DropTable
DROP TABLE "solution_mcq";

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
    "image_url" TEXT,
    "difficulty_level" "DifficultyLevel" NOT NULL DEFAULT 'Beginner',
    "step_count" INTEGER NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "question_type_id" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBase_question_id_key" ON "SolutionBase"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionDescriptive_solution_base_id_key" ON "SolutionDescriptive"("solution_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "Auth_clerk_id_key" ON "Auth"("clerk_id");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_question_type_id_fkey" FOREIGN KEY ("question_type_id") REFERENCES "question_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBase" ADD CONSTRAINT "SolutionBase_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionMcq" ADD CONSTRAINT "SolutionMcq_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionDescriptive" ADD CONSTRAINT "SolutionDescriptive_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
