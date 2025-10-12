-- CreateTable
CREATE TABLE "public"."FeedbackTemplate" (
    "id" SERIAL NOT NULL,
    "studyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."FeedbackTemplate" ADD CONSTRAINT "FeedbackTemplate_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
