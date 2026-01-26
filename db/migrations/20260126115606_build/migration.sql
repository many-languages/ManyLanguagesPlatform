/*
  Warnings:

  - You are about to drop the column `setupRevision` on the `ExtractionSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `studyId` on the `ExtractionSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `extractionSnapshotId` on the `FeedbackTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `setupRevision` on the `FeedbackTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `setupRevision` on the `PilotDatasetSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `studyId` on the `PilotDatasetSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `setupRevision` on the `PilotLink` table. All the data in the column will be lost.
  - You are about to drop the column `studyId` on the `PilotLink` table. All the data in the column will be lost.
  - You are about to drop the column `approvedExtractionId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosBatchId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosComponentId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosComponentUUID` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosFileName` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosStudyId` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosWorkerType` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `setupRevision` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `step1Completed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `step2Completed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `step3Completed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `step4Completed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `step5Completed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `step6Completed` on the `Study` table. All the data in the column will be lost.
  - You are about to drop the column `jatosRunUrl` on the `StudyResearcher` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[jatosStudyUploadId,pilotDatasetHash]` on the table `PilotDatasetSnapshot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jatosStudyUploadId` to the `ExtractionSnapshot` table without a default value. This is not possible if the table is not empty.
  - Made the column `pilotDatasetSnapshotId` on table `ExtractionSnapshot` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `jatosStudyUploadId` to the `PilotDatasetSnapshot` table without a default value. This is not possible if the table is not empty.
  - Made the column `markerTokens` on table `PilotDatasetSnapshot` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `jatosStudyUploadId` to the `PilotLink` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ValidationStatus" AS ENUM ('NEEDS_REVIEW', 'VALID', 'INVALID');

-- DropForeignKey
ALTER TABLE "public"."ExtractionSnapshot" DROP CONSTRAINT "ExtractionSnapshot_pilotDatasetSnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExtractionSnapshot" DROP CONSTRAINT "ExtractionSnapshot_studyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeedbackTemplate" DROP CONSTRAINT "FeedbackTemplate_extractionSnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PilotDatasetSnapshot" DROP CONSTRAINT "PilotDatasetSnapshot_studyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PilotLink" DROP CONSTRAINT "PilotLink_studyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Study" DROP CONSTRAINT "Study_approvedExtractionId_fkey";

-- DropIndex
DROP INDEX "public"."ExtractionSnapshot_studyId_setupRevision_status_createdAt_idx";

-- DropIndex
DROP INDEX "public"."PilotDatasetSnapshot_studyId_setupRevision_createdAt_idx";

-- DropIndex
DROP INDEX "public"."PilotDatasetSnapshot_studyId_setupRevision_pilotDatasetHash_key";

-- DropIndex
DROP INDEX "public"."PilotLink_studyId_setupRevision_createdAt_idx";

-- DropIndex
DROP INDEX "public"."PilotLink_studyId_setupRevision_idx";

-- DropIndex
DROP INDEX "public"."PilotLink_studyResearcherId_setupRevision_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Study_approvedExtractionId_key";

-- AlterTable
ALTER TABLE "public"."ExtractionSnapshot" DROP COLUMN "setupRevision",
DROP COLUMN "studyId",
ADD COLUMN     "jatosStudyUploadId" INTEGER NOT NULL,
ALTER COLUMN "pilotDatasetSnapshotId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."FeedbackTemplate" DROP COLUMN "extractionSnapshotId",
DROP COLUMN "setupRevision",
ADD COLUMN     "extraKeys" JSONB,
ADD COLUMN     "missingKeys" JSONB,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedExtractionId" INTEGER,
ADD COLUMN     "validationStatus" "public"."ValidationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW';

-- AlterTable
ALTER TABLE "public"."PilotDatasetSnapshot" DROP COLUMN "setupRevision",
DROP COLUMN "studyId",
ADD COLUMN     "jatosStudyUploadId" INTEGER NOT NULL,
ALTER COLUMN "markerTokens" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."PilotLink" DROP COLUMN "setupRevision",
DROP COLUMN "studyId",
ADD COLUMN     "jatosStudyUploadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Study" DROP COLUMN "approvedExtractionId",
DROP COLUMN "jatosBatchId",
DROP COLUMN "jatosComponentId",
DROP COLUMN "jatosComponentUUID",
DROP COLUMN "jatosFileName",
DROP COLUMN "jatosStudyId",
DROP COLUMN "jatosWorkerType",
DROP COLUMN "setupRevision",
DROP COLUMN "step1Completed",
DROP COLUMN "step2Completed",
DROP COLUMN "step3Completed",
DROP COLUMN "step4Completed",
DROP COLUMN "step5Completed",
DROP COLUMN "step6Completed";

-- AlterTable
ALTER TABLE "public"."StudyResearcher" DROP COLUMN "jatosRunUrl";

-- CreateTable
CREATE TABLE "public"."JatosStudyUpload" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studyId" INTEGER NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "jatosStudyId" INTEGER NOT NULL,
    "jatosFileName" TEXT NOT NULL,
    "jatosComponentId" INTEGER,
    "jatosComponentUUID" TEXT,
    "jatosBatchId" INTEGER,
    "jatosWorkerType" "public"."JatosWorkerType" NOT NULL DEFAULT 'SINGLE',
    "buildHash" TEXT NOT NULL,
    "hashAlgorithm" TEXT NOT NULL DEFAULT 'sha256',
    "approvedExtractionId" INTEGER,
    "step1Completed" BOOLEAN NOT NULL DEFAULT false,
    "step2Completed" BOOLEAN NOT NULL DEFAULT false,
    "step3Completed" BOOLEAN NOT NULL DEFAULT false,
    "step4Completed" BOOLEAN NOT NULL DEFAULT false,
    "step5Completed" BOOLEAN NOT NULL DEFAULT false,
    "step6Completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JatosStudyUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JatosStudyUpload_approvedExtractionId_key" ON "public"."JatosStudyUpload"("approvedExtractionId");

-- CreateIndex
CREATE INDEX "JatosStudyUpload_studyId_createdAt_idx" ON "public"."JatosStudyUpload"("studyId", "createdAt");

-- CreateIndex
CREATE INDEX "JatosStudyUpload_buildHash_idx" ON "public"."JatosStudyUpload"("buildHash");

-- CreateIndex
CREATE UNIQUE INDEX "JatosStudyUpload_studyId_versionNumber_key" ON "public"."JatosStudyUpload"("studyId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "JatosStudyUpload_studyId_buildHash_key" ON "public"."JatosStudyUpload"("studyId", "buildHash");

-- CreateIndex
CREATE INDEX "ExtractionSnapshot_jatosStudyUploadId_status_createdAt_idx" ON "public"."ExtractionSnapshot"("jatosStudyUploadId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PilotDatasetSnapshot_jatosStudyUploadId_createdAt_idx" ON "public"."PilotDatasetSnapshot"("jatosStudyUploadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PilotDatasetSnapshot_jatosStudyUploadId_pilotDatasetHash_key" ON "public"."PilotDatasetSnapshot"("jatosStudyUploadId", "pilotDatasetHash");

-- CreateIndex
CREATE INDEX "PilotLink_studyResearcherId_createdAt_idx" ON "public"."PilotLink"("studyResearcherId", "createdAt");

-- CreateIndex
CREATE INDEX "PilotLink_jatosStudyUploadId_createdAt_idx" ON "public"."PilotLink"("jatosStudyUploadId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."FeedbackTemplate" ADD CONSTRAINT "FeedbackTemplate_validatedExtractionId_fkey" FOREIGN KEY ("validatedExtractionId") REFERENCES "public"."ExtractionSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PilotLink" ADD CONSTRAINT "PilotLink_jatosStudyUploadId_fkey" FOREIGN KEY ("jatosStudyUploadId") REFERENCES "public"."JatosStudyUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PilotDatasetSnapshot" ADD CONSTRAINT "PilotDatasetSnapshot_jatosStudyUploadId_fkey" FOREIGN KEY ("jatosStudyUploadId") REFERENCES "public"."JatosStudyUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtractionSnapshot" ADD CONSTRAINT "ExtractionSnapshot_pilotDatasetSnapshotId_fkey" FOREIGN KEY ("pilotDatasetSnapshotId") REFERENCES "public"."PilotDatasetSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExtractionSnapshot" ADD CONSTRAINT "ExtractionSnapshot_jatosStudyUploadId_fkey" FOREIGN KEY ("jatosStudyUploadId") REFERENCES "public"."JatosStudyUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JatosStudyUpload" ADD CONSTRAINT "JatosStudyUpload_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JatosStudyUpload" ADD CONSTRAINT "JatosStudyUpload_approvedExtractionId_fkey" FOREIGN KEY ("approvedExtractionId") REFERENCES "public"."ExtractionSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
