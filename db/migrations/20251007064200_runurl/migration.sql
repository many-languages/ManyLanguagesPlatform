/*
  Warnings:

  - You are about to drop the column `jatosToken` on the `ParticipantStudy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ParticipantStudy" DROP COLUMN "jatosToken",
ADD COLUMN     "jatosRunUrl" TEXT;
