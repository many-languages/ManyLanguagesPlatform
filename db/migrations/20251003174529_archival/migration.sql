-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" INTEGER;

-- CreateIndex
CREATE INDEX "Study_archived_createdAt_idx" ON "public"."Study"("archived", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Study" ADD CONSTRAINT "Study_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
