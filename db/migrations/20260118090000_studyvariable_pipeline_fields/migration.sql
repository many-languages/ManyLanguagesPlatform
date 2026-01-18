-- Rename columns to match pipeline terminology
ALTER TABLE "StudyVariable" RENAME COLUMN "name" TO "variableKey";
ALTER TABLE "StudyVariable" RENAME COLUMN "label" TO "variableName";

-- Replace single example with JSON array of examples
ALTER TABLE "StudyVariable" DROP COLUMN "example";
ALTER TABLE "StudyVariable" ADD COLUMN "examples" JSONB;

-- Backfill and enforce required fields
UPDATE "StudyVariable" SET "variableName" = "variableKey" WHERE "variableName" IS NULL;
ALTER TABLE "StudyVariable" ALTER COLUMN "variableName" SET NOT NULL;

UPDATE "StudyVariable" SET "type" = 'string' WHERE "type" IS NULL;
ALTER TABLE "StudyVariable" ALTER COLUMN "type" SET NOT NULL;

-- Update unique constraint
DROP INDEX IF EXISTS "StudyVariable_studyId_name_key";
CREATE UNIQUE INDEX "StudyVariable_studyId_variableKey_key" ON "StudyVariable"("studyId", "variableKey");

