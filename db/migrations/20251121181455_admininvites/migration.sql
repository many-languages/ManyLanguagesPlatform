-- CreateTable
CREATE TABLE "public"."AdminInvite" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvite_token_key" ON "public"."AdminInvite"("token");

-- CreateIndex
CREATE INDEX "AdminInvite_email_idx" ON "public"."AdminInvite"("email");

-- CreateIndex
CREATE INDEX "AdminInvite_expiresAt_idx" ON "public"."AdminInvite"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."AdminInvite" ADD CONSTRAINT "AdminInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
