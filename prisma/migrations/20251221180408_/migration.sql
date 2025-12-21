/*
  Warnings:

  - You are about to drop the `RunningCanvas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RunningCanvas" DROP CONSTRAINT "RunningCanvas_question_id_fkey";

-- DropForeignKey
ALTER TABLE "RunningCanvas" DROP CONSTRAINT "RunningCanvas_user_id_fkey";

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "topic_id" TEXT;

-- DropTable
DROP TABLE "RunningCanvas";

-- CreateTable
CREATE TABLE "ActiveCanvas" (
    "id" TEXT NOT NULL,
    "hint" TEXT,
    "canvas_json" TEXT,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,

    CONSTRAINT "ActiveCanvas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveCanvas" ADD CONSTRAINT "ActiveCanvas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveCanvas" ADD CONSTRAINT "ActiveCanvas_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
