/*
  Warnings:

  - The values [Beginner,Intermediate,Advanced] on the enum `DifficultyLevel` will be removed. If these variants are still used in the database, this will fail.
  - The `difficulty` column on the `Exam` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DifficultyLevel_new" AS ENUM ('Easy', 'Medium', 'Hard');
ALTER TABLE "Question" ALTER COLUMN "difficulty_level" DROP DEFAULT;
ALTER TABLE "Question" ALTER COLUMN "difficulty_level" TYPE "DifficultyLevel_new" USING ("difficulty_level"::text::"DifficultyLevel_new");
ALTER TABLE "Exam" ALTER COLUMN "difficulty" TYPE "DifficultyLevel_new" USING ("difficulty"::text::"DifficultyLevel_new");
ALTER TYPE "DifficultyLevel" RENAME TO "DifficultyLevel_old";
ALTER TYPE "DifficultyLevel_new" RENAME TO "DifficultyLevel";
DROP TYPE "DifficultyLevel_old";
ALTER TABLE "Question" ALTER COLUMN "difficulty_level" SET DEFAULT 'Easy';
COMMIT;

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "DifficultyLevel";

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "difficulty_level" SET DEFAULT 'Easy';

-- DropEnum
DROP TYPE "ExamDifficulty";
