-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('Scheduled', 'InProgress', 'InReview', 'Graded');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('Competetive', 'Normal', 'Mock');

-- CreateEnum
CREATE TYPE "ExamDifficulty" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_file_name" TEXT,
    "module_id" TEXT,
    "serial_number" INTEGER NOT NULL,
    "paper_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtopics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_file_name" TEXT,
    "serial_number" INTEGER NOT NULL,
    "content" TEXT,
    "topic_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "type" "ExamType" NOT NULL,
    "difficulty" "ExamDifficulty",
    "time_limit" INTEGER,
    "max_number_of_questions" INTEGER,
    "status" "ReviewStatus",
    "total_marks" INTEGER,
    "class_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subtopics" (
    "exam_id" INTEGER NOT NULL,
    "topic_id" TEXT NOT NULL,
    "subtopic_id" TEXT NOT NULL,

    CONSTRAINT "exam_subtopics_pkey" PRIMARY KEY ("exam_id","topic_id","subtopic_id")
);

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subtopics" ADD CONSTRAINT "exam_subtopics_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subtopics" ADD CONSTRAINT "exam_subtopics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subtopics" ADD CONSTRAINT "exam_subtopics_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


