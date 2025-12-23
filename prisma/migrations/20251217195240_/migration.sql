-- AlterTable
ALTER TABLE "question_sets" ADD COLUMN     "homework_id" INTEGER,
ADD COLUMN     "mark_scheme_url" TEXT,
ADD COLUMN     "module_id" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "season" TEXT,
ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "year" INTEGER;
