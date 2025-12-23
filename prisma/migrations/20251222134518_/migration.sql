-- AlterTable
ALTER TABLE "SubmittedDescriptive" ADD COLUMN     "canvas_json" JSONB,
ADD COLUMN     "is_correct" BOOLEAN NOT NULL DEFAULT false;
