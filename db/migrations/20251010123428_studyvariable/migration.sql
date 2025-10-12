-- AlterTable
ALTER TABLE "public"."StudyResearcher" ADD COLUMN     "jatosRunUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."StudyVariable" (
    "id" SERIAL NOT NULL,
    "studyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT,
    "example" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyVariable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyVariable_studyId_name_key" ON "public"."StudyVariable"("studyId", "name");

-- AddForeignKey
ALTER TABLE "public"."StudyVariable" ADD CONSTRAINT "StudyVariable_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
