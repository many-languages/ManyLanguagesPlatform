-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "step1Completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "step2Completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "step3Completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "step4Completed" BOOLEAN NOT NULL DEFAULT false;
