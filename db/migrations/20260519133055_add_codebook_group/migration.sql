-- CreateTable
CREATE TABLE "public"."CodebookGroup" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codebookId" INTEGER NOT NULL,
    "groupKey" TEXT NOT NULL,
    "description" TEXT,
    "personalData" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CodebookGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodebookGroup_codebookId_idx" ON "public"."CodebookGroup"("codebookId");

-- CreateIndex
CREATE UNIQUE INDEX "CodebookGroup_codebookId_groupKey_key" ON "public"."CodebookGroup"("codebookId", "groupKey");

-- AddForeignKey
ALTER TABLE "public"."CodebookGroup" ADD CONSTRAINT "CodebookGroup_codebookId_fkey" FOREIGN KEY ("codebookId") REFERENCES "public"."Codebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
