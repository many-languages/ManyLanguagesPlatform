-- AlterTable
ALTER TABLE "public"."ParticipantStudy" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payed" BOOLEAN NOT NULL DEFAULT false;
