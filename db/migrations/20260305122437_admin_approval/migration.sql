-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "adminApproved" BOOLEAN,
ADD COLUMN     "adminReviewedAt" TIMESTAMP(3),
ADD COLUMN     "adminReviewedById" INTEGER;

-- Backfill: existing studies are treated as approved so they continue working
UPDATE "public"."Study" SET "adminApproved" = true WHERE "adminApproved" IS NULL;

-- AddForeignKey
ALTER TABLE "public"."Study" ADD CONSTRAINT "Study_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
