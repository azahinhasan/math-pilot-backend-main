-- Rename enum value typo: Competetive -> Competitive
-- Safe for existing DBs where "ExamType" already exists with the misspelling.
ALTER TYPE "ExamType" RENAME VALUE 'Competetive' TO 'Competitive';


