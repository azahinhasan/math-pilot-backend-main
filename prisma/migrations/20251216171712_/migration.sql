-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('Scheduled', 'InProgress', 'InReview', 'Graded');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('Competitive', 'Normal', 'Mock');

-- CreateEnum
CREATE TYPE "ExamDifficulty" AS ENUM ('Easy', 'Medium', 'Hard');

-- CreateEnum
CREATE TYPE "GradingType" AS ENUM ('GRADED', 'PRACTISE');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'PRACTICE');

-- CreateTable
CREATE TABLE "SolutionMatchingPair" (
    "match_pair_id" TEXT NOT NULL,
    "solution_base_id" TEXT NOT NULL,
    "column_left_text" TEXT NOT NULL,
    "column_right_text" TEXT NOT NULL,
    "mark" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SolutionMatchingPair_pkey" PRIMARY KEY ("match_pair_id")
);

-- CreateTable
CREATE TABLE "StudentSchedule" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "type" "ExamType" NOT NULL,
    "difficulty" "ExamDifficulty",
    "time_limit" INTEGER,
    "max_number_of_questions" INTEGER,
    "status" "ReviewStatus",
    "total_marks" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubtopic" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "subtopic_id" TEXT NOT NULL,

    CONSTRAINT "ExamSubtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "type" "AssignmentType" NOT NULL,
    "grading_type" "GradingType" NOT NULL,
    "status" "ReviewStatus",
    "subtopic_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSet" (
    "id" TEXT NOT NULL,
    "serial_no" INTEGER,
    "question_id" TEXT,
    "exam_id" TEXT,
    "homework_id" INTEGER,
    "name" TEXT,
    "year" INTEGER,
    "season" TEXT,
    "mark_scheme_url" TEXT,
    "module_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmittedMatchingPair" (
    "match_pair_id" TEXT NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "solution_id" TEXT NOT NULL,
    "column_left_text" TEXT NOT NULL,
    "column_right_text" TEXT NOT NULL,
    "awarded_mark" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "voided" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubmittedMatchingPair_pkey" PRIMARY KEY ("match_pair_id")
);

-- CreateTable
CREATE TABLE "RunningCanvas" (
    "id" TEXT NOT NULL,
    "hint" TEXT,
    "canvas_json" TEXT,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,

    CONSTRAINT "RunningCanvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiResponse" (
    "id" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "image_key" TEXT,
    "evaluation" TEXT NOT NULL,
    "ocr_output" TEXT,
    "question_title" TEXT,
    "verdict" TEXT,
    "hint" TEXT,
    "is_finished" BOOLEAN,
    "next_step_count" INTEGER,
    "chat_history" TEXT,
    "question_id" TEXT,

    CONSTRAINT "AiResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL,
    "chat_history" TEXT,
    "evaluation" TEXT,
    "extracted_text" TEXT,
    "hint" TEXT,
    "verdict" BOOLEAN,
    "outdated" BOOLEAN,
    "canvas_json" TEXT,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT,
    "module_id" TEXT,
    "subtopic_id" TEXT,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamLog" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "exam_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianStudentMap" (
    "id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,

    CONSTRAINT "GuardianStudentMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalLevel" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "board_age_level_id" TEXT NOT NULL,

    CONSTRAINT "GoalLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionLevel" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "board_age_level_id" TEXT NOT NULL,

    CONSTRAINT "QuestionLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTopicProgress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "status" "SubmissionStatus",
    "questions_attempted" INTEGER,
    "questions_correct" INTEGER,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "time_spent_in_seconds" INTEGER NOT NULL DEFAULT 0,
    "ai_generated_notes_url" TEXT,
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTopicProgress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SolutionMatchingPair" ADD CONSTRAINT "SolutionMatchingPair_solution_base_id_fkey" FOREIGN KEY ("solution_base_id") REFERENCES "SolutionBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSchedule" ADD CONSTRAINT "StudentSchedule_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSchedule" ADD CONSTRAINT "StudentSchedule_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubtopic" ADD CONSTRAINT "ExamSubtopic_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubtopic" ADD CONSTRAINT "ExamSubtopic_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubtopic" ADD CONSTRAINT "ExamSubtopic_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_homework_id_fkey" FOREIGN KEY ("homework_id") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedMatchingPair" ADD CONSTRAINT "SubmittedMatchingPair_submission_id_solution_id_fkey" FOREIGN KEY ("submission_id", "solution_id") REFERENCES "SubmittedAnswer"("submission_id", "solution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningCanvas" ADD CONSTRAINT "RunningCanvas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningCanvas" ADD CONSTRAINT "RunningCanvas_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiResponse" ADD CONSTRAINT "AiResponse_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamLog" ADD CONSTRAINT "ExamLog_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamLog" ADD CONSTRAINT "ExamLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianStudentMap" ADD CONSTRAINT "GuardianStudentMap_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "Guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianStudentMap" ADD CONSTRAINT "GuardianStudentMap_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalLevel" ADD CONSTRAINT "GoalLevel_board_age_level_id_fkey" FOREIGN KEY ("board_age_level_id") REFERENCES "BoardAgeLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionLevel" ADD CONSTRAINT "QuestionLevel_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionLevel" ADD CONSTRAINT "QuestionLevel_board_age_level_id_fkey" FOREIGN KEY ("board_age_level_id") REFERENCES "BoardAgeLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicProgress" ADD CONSTRAINT "StudentTopicProgress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicProgress" ADD CONSTRAINT "StudentTopicProgress_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
