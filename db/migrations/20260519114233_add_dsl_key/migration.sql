/*
  Warnings:

  - Added the required column `dslKey` to the `CodebookEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dslKey` to the `StudyVariable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."CodebookEntry" ADD COLUMN     "dslKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."StudyVariable" ADD COLUMN     "dslKey" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "StudyVariable_extractionSnapshotId_dslKey_idx" ON "public"."StudyVariable"("extractionSnapshotId", "dslKey");
