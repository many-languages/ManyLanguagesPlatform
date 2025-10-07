/*
  Warnings:

  - Added the required column `jatosBatchId` to the `Study` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "jatosBatchId" INTEGER NOT NULL;
