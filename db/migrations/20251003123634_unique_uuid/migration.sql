/*
  Warnings:

  - A unique constraint covering the columns `[jatosStudyUUID]` on the table `Study` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Study_jatosStudyUUID_key" ON "public"."Study"("jatosStudyUUID");
