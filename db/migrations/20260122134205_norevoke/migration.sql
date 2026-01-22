/*
  Warnings:

  - You are about to drop the column `revokedAt` on the `PilotLink` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PilotLink" DROP COLUMN "revokedAt";
