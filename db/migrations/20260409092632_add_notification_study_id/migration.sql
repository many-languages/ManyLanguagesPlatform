-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "studyId" INTEGER;

-- CreateIndex
CREATE INDEX "Notification_studyId_idx" ON "public"."Notification"("studyId");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
