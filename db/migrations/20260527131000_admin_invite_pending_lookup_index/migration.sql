-- Add pending-invite scan index for admin invite list and reminder workflows.
CREATE INDEX "AdminInvite_redeemedAt_revokedAt_expiresAt_createdAt_idx" ON "public"."AdminInvite"("redeemedAt", "revokedAt", "expiresAt", "createdAt");
