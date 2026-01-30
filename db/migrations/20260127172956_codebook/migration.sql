/*
  Warnings:

  - You are about to drop the column `description` on the `StudyVariable` table. All the data in the column will be lost.
  - You are about to drop the column `personalData` on the `StudyVariable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."StudyVariable" DROP COLUMN "description",
DROP COLUMN "personalData";

-- CreateTable
CREATE TABLE "public"."Codebook" (
    "id" SERIAL NOT NULL,
    "studyId" INTEGER NOT NULL,
    "validatedExtractionId" INTEGER,
    "validationStatus" "public"."ValidationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "validatedAt" TIMESTAMP(3),
    "missingKeys" JSONB,
    "extraKeys" JSONB,
    "extractorVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Codebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CodebookEntry" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codebookId" INTEGER NOT NULL,
    "variableKey" TEXT NOT NULL,
    "variableName" TEXT NOT NULL,
    "description" TEXT,
    "personalData" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CodebookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Codebook_studyId_key" ON "public"."Codebook"("studyId");

-- CreateIndex
CREATE INDEX "CodebookEntry_codebookId_idx" ON "public"."CodebookEntry"("codebookId");

-- CreateIndex
CREATE UNIQUE INDEX "CodebookEntry_codebookId_variableKey_key" ON "public"."CodebookEntry"("codebookId", "variableKey");

-- AddForeignKey
ALTER TABLE "public"."Codebook" ADD CONSTRAINT "Codebook_validatedExtractionId_fkey" FOREIGN KEY ("validatedExtractionId") REFERENCES "public"."ExtractionSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Codebook" ADD CONSTRAINT "Codebook_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "public"."Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CodebookEntry" ADD CONSTRAINT "CodebookEntry_codebookId_fkey" FOREIGN KEY ("codebookId") REFERENCES "public"."Codebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
