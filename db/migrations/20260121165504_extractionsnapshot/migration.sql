/*
  Warnings:

  - You are about to drop the column `studyId` on the `StudyVariable` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[approvedExtractionId]` on the table `Study` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[extractionSnapshotId,variableKey]` on the table `StudyVariable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `extractionSnapshotId` to the `FeedbackTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `setupRevision` to the `FeedbackTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `extractionSnapshotId` to the `StudyVariable` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ExtractionSnapshotStatus" AS ENUM ('DRAFT', 'APPROVED');

-- DropForeignKey
ALTER TABLE "public"."FeedbackTemplate" DROP CONSTRAINT "FeedbackTemplate_studyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."StudyVariable" DROP CONSTRAINT "StudyVariable_studyId_fkey";

-- DropIndex
DROP INDEX "public"."StudyVariable_studyId_variableKey_key";

-- AlterTable
ALTER TABLE "public"."FeedbackTemplate" ADD COLUMN     "extractionSnapshotId" INTEGER NOT NULL,
ADD COLUMN     "extractorVersion" TEXT,
ADD COLUMN     "lastPreviewPilotDatasetHash" TEXT,
ADD COLUMN     "lastPreviewedAt" TIMESTAMP(3),
ADD COLUMN     "requiredVariableKeys" JSONB,
ADD COLUMN     "setupRevision" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "approvedExtractionId" INTEGER,
ADD COLUMN     "setupRevision" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."StudyVariable" DROP COLUMN "studyId",
ADD COLUMN     "extractionSnapshotId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."PilotLink" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "studyId" INTEGER NOT NULL,
    "studyResearcherId" INTEGER NOT NULL,
    "setupRevision" INTEGER NOT NULL,
    "jatosRunUrl" TEXT NOT NULL,
    "markerToken" TEXT NOT NULL,

    CONSTRAINT "PilotLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PilotDatasetSnapshot" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studyId" INTEGER NOT NULL,
    "setupRevision" INTEGER NOT NULL,
    "pilotDatasetHash" TEXT NOT NULL,
    "pilotRunCount" INTEGER NOT NULL,
    "pilotRunIds" JSONB,
    "markerTokens" JSONB,

    CONSTRAINT "PilotDatasetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExtractionSnapshot" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "setupRevision" INTEGER NOT NULL,
    "status" "public"."ExtractionSnapshotStatus" NOT NULL DEFAULT 'DRAFT',
    "pilotDatasetSnapshotId" INTEGER,
    "extractorVersion" TEXT NOT NULL,
    "extractorConfigHash" TEXT,
    "structureSummary" JSONB,
    "aggregates" JSONB,
    "studyId" INTEGER NOT NULL,

    CONSTRAINT "ExtractionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PilotLink_markerToken_key" ON "public"."PilotLink"("markerToken");

-- CreateIndex
CREATE INDEX "PilotLink_studyId_setupRevision_createdAt_idx" ON "public"."PilotLink"("studyId", "setupRevision", "createdAt");

-- CreateIndex
CREATE INDEX "PilotLink_studyResearcherId_setupRevision_createdAt_idx" ON "public"."PilotLink"("studyResearcherId", "setupRevision", "createdAt");

-- CreateIndex
CREATE INDEX "PilotLink_studyId_setupRevision_idx" ON "public"."PilotLink"("studyId", "setupRevision");

-- CreateIndex
CREATE INDEX "PilotDatasetSnapshot_studyId_setupRevision_createdAt_idx" ON "public"."PilotDatasetSnapshot"("studyId", "setupRevision", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PilotDatasetSnapshot_studyId_setupRevision_pilotDatasetHash_key" ON "public"."PilotDatasetSnapshot"("studyId", "setupRevision", "pilotDatasetHash");

-- CreateIndex
CREATE INDEX "ExtractionSnapshot_studyId_setupRevision_status_createdAt_idx" ON "public"."ExtractionSnapshot"("studyId", "setupRevision", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Study_approvedExtractionId_key" ON "public"."Study"("approvedExtractionId");

-- CreateIndex
CREATE INDEX "StudyVariable_extractionSnapshotId_idx" ON "public"."StudyVariable"("extractionSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyVariable_extractionSnapshotId_variableKey_key" ON "public"."StudyVariable"("extractionSnapshotId", "variableKey");

-- AddForeignKey
ALTER TABLE "public"."Study" ADD CONSTRAINT "Study_approvedExtractionId_fkey" FOREIGN KEY ("approvedExtractionId") REFERENCES "public"."ExtractionSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudyVariable" ADD CONSTRAINT "StudyVariable_extractionSnapshotId_fkey" FOREIGN KEY ("extractionSnapshotId") REFERENCES "public"."ExtractionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackTemplate" ADD CONSTRAINT "FeedbackTemplate_extractionSnapshotId_fkey" FOREIGN KEY ("extractionSnapshotId") REFERENCES "public"."ExtractionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackTemplate" ADD CONSTRAINT "FeedbackTemplate_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PilotLink" ADD CONSTRAINT "PilotLink_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PilotLink" ADD CONSTRAINT "PilotLink_studyResearcherId_fkey" FOREIGN KEY ("studyResearcherId") REFERENCES "public"."StudyResearcher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PilotDatasetSnapshot" ADD CONSTRAINT "PilotDatasetSnapshot_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtractionSnapshot" ADD CONSTRAINT "ExtractionSnapshot_pilotDatasetSnapshotId_fkey" FOREIGN KEY ("pilotDatasetSnapshotId") REFERENCES "public"."PilotDatasetSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtractionSnapshot" ADD CONSTRAINT "ExtractionSnapshot_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
