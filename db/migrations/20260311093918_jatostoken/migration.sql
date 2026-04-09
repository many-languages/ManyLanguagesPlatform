-- CreateTable
CREATE TABLE "public"."ResearcherJatos" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jatosUserId" INTEGER NOT NULL,
    "encryptedJatosToken" TEXT NOT NULL,

    CONSTRAINT "ResearcherJatos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearcherJatos_userId_key" ON "public"."ResearcherJatos"("userId");

-- AddForeignKey
ALTER TABLE "public"."ResearcherJatos" ADD CONSTRAINT "ResearcherJatos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
