-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "step5Completed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."StudyVariable" ADD COLUMN     "description" TEXT,
ADD COLUMN     "personalData" BOOLEAN NOT NULL DEFAULT false;
