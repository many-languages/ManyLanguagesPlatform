/*
  Warnings:

  - You are about to drop the column `lastPreviewPilotDatasetHash` on the `FeedbackTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `lastPreviewedAt` on the `FeedbackTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."FeedbackTemplate" DROP COLUMN "lastPreviewPilotDatasetHash",
DROP COLUMN "lastPreviewedAt";
