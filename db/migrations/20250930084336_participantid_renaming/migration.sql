/*
  Warnings:

  - You are about to drop the column `participantId` on the `ParticipantStudy` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,studyId]` on the table `ParticipantStudy` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `ParticipantStudy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ParticipantStudy" DROP CONSTRAINT "ParticipantStudy_participantId_fkey";

-- DropIndex
DROP INDEX "public"."ParticipantStudy_participantId_studyId_key";

-- AlterTable
ALTER TABLE "public"."ParticipantStudy" DROP COLUMN "participantId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantStudy_userId_studyId_key" ON "public"."ParticipantStudy"("userId", "studyId");

-- AddForeignKey
ALTER TABLE "public"."ParticipantStudy" ADD CONSTRAINT "ParticipantStudy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
