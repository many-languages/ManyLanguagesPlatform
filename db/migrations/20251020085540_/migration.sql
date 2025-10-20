/*
  Warnings:

  - A unique constraint covering the columns `[studyId]` on the table `FeedbackTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FeedbackTemplate_studyId_key" ON "public"."FeedbackTemplate"("studyId");
