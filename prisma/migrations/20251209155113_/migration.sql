/*
  Warnings:

  - You are about to drop the column `title` on the `questions` table. All the data in the column will be lost.
  - Added the required column `name` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "title",
ADD COLUMN     "difficulty_level" "DifficultyLevel" NOT NULL DEFAULT 'Beginner',
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "time_limit" INTEGER;
