/*
  Warnings:

  - Added the required column `question_text` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "question_text" TEXT NOT NULL;
