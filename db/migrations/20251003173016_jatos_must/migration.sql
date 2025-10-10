/*
  Warnings:

  - Made the column `jatosFileName` on table `Study` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jatosStudyId` on table `Study` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jatosStudyUUID` on table `Study` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Study" ALTER COLUMN "jatosFileName" SET NOT NULL,
ALTER COLUMN "jatosStudyId" SET NOT NULL,
ALTER COLUMN "jatosStudyUUID" SET NOT NULL;
