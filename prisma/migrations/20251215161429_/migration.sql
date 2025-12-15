/*
  Warnings:

  - You are about to drop the `modules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_board_age_level_id_fkey";

-- DropTable
DROP TABLE "modules";

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "board_age_level_id" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "formula_book_url" TEXT,
    "logo_file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_subject_board_age_level_id_key" ON "Module"("name", "subject", "board_age_level_id");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_board_age_level_id_fkey" FOREIGN KEY ("board_age_level_id") REFERENCES "BoardAgeLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
