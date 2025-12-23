/*
  Warnings:

  - Made the column `canvas_json` on table `ActiveCanvas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `canvas_json` on table `SubmittedDescriptive` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ActiveCanvas" ALTER COLUMN "canvas_json" SET NOT NULL;

-- AlterTable
ALTER TABLE "SubmittedDescriptive" ALTER COLUMN "canvas_json" SET NOT NULL;
