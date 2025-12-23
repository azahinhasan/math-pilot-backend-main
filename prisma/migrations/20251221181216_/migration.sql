/*
  Warnings:

  - The values [HUMAN] on the enum `ContentBy` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `module_id` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Made the column `topic_id` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Made the column `subtopic_id` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContentBy_new" AS ENUM ('Human', 'AI');
ALTER TABLE "Question" ALTER COLUMN "content_by" DROP DEFAULT;
ALTER TABLE "Question" ALTER COLUMN "content_by" TYPE "ContentBy_new" USING ("content_by"::text::"ContentBy_new");
ALTER TYPE "ContentBy" RENAME TO "ContentBy_old";
ALTER TYPE "ContentBy_new" RENAME TO "ContentBy";
DROP TYPE "ContentBy_old";
ALTER TABLE "Question" ALTER COLUMN "content_by" SET DEFAULT 'AI';
COMMIT;

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_module_id_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_subtopic_id_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_topic_id_fkey";

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "question_content_link" DROP NOT NULL,
ALTER COLUMN "content_by" SET DEFAULT 'AI',
ALTER COLUMN "hint" DROP NOT NULL,
ALTER COLUMN "module_id" SET NOT NULL,
ALTER COLUMN "topic_id" SET NOT NULL,
ALTER COLUMN "subtopic_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
