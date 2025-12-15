-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('Mathematics');

-- CreateTable
CREATE TABLE "modules" (
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

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_board_age_level_id_fkey" FOREIGN KEY ("board_age_level_id") REFERENCES "BoardAgeLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
