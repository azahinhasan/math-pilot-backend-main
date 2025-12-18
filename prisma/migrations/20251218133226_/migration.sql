/*
  Warnings:

  - The values [HOMEWORK,PRACTICE] on the enum `AssignmentType` will be removed. If these variants are still used in the database, this will fail.
  - The values [GRADED,PRACTISE] on the enum `GradingType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `difficulty` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the `StudentTopicProgress` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[guardian_id,student_id]` on the table `GuardianStudentMap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AssignmentType_new" AS ENUM ('Homework', 'Practice');
ALTER TABLE "Assignment" ALTER COLUMN "type" TYPE "AssignmentType_new" USING ("type"::text::"AssignmentType_new");
ALTER TYPE "AssignmentType" RENAME TO "AssignmentType_old";
ALTER TYPE "AssignmentType_new" RENAME TO "AssignmentType";
DROP TYPE "AssignmentType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "GradingType_new" AS ENUM ('Graded', 'Practise');
ALTER TABLE "Assignment" ALTER COLUMN "grading_type" TYPE "GradingType_new" USING ("grading_type"::text::"GradingType_new");
ALTER TYPE "GradingType" RENAME TO "GradingType_old";
ALTER TYPE "GradingType_new" RENAME TO "GradingType";
DROP TYPE "GradingType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "StudentTopicProgress" DROP CONSTRAINT "StudentTopicProgress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "StudentTopicProgress" DROP CONSTRAINT "StudentTopicProgress_topic_id_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "difficulty";

-- DropTable
DROP TABLE "StudentTopicProgress";

-- CreateTable
CREATE TABLE "StudentTopicDetails" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "status" "SubmissionStatus",
    "questions_attempted" INTEGER,
    "questions_correct" INTEGER,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_in_seconds" INTEGER NOT NULL DEFAULT 0,
    "ai_generated_notes_url" TEXT,
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTopicDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuardianStudentMap_guardian_id_student_id_key" ON "GuardianStudentMap"("guardian_id", "student_id");

-- AddForeignKey
ALTER TABLE "SubmittedMcq" ADD CONSTRAINT "SubmittedMcq_solution_id_fkey" FOREIGN KEY ("solution_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedDescriptive" ADD CONSTRAINT "SubmittedDescriptive_solution_id_fkey" FOREIGN KEY ("solution_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicDetails" ADD CONSTRAINT "StudentTopicDetails_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicDetails" ADD CONSTRAINT "StudentTopicDetails_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
