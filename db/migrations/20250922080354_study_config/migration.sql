/*
  Warnings:

  - Added the required column `endDate` to the `Study` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ethicalPermission` to the `Study` table without a default value. This is not possible if the table is not empty.
  - Added the required column `length` to the `Study` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment` to the `Study` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sampleSize` to the `Study` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Study` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Study` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Study" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ethicalPermission" TEXT NOT NULL,
ADD COLUMN     "length" TEXT NOT NULL,
ADD COLUMN     "payment" TEXT NOT NULL,
ADD COLUMN     "sampleSize" INTEGER NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "StudyStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "description" SET NOT NULL;
