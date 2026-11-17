-- AlterTable
ALTER TABLE "public"."StudyVariable" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing rows were inserted in extraction order, so id order within a snapshot is that order.
UPDATE "public"."StudyVariable" sv
SET "position" = ranked.pos
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "extractionSnapshotId" ORDER BY "id") - 1 AS pos
  FROM "public"."StudyVariable"
) ranked
WHERE sv."id" = ranked."id";
