-- Durable audit trail for sensitive admin actions.
-- Entity references are intentionally denormalized so audit rows survive
-- deletion of the audited object (for example, Study deletion).
CREATE TABLE "public"."AdminAuditEvent" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER,
    "actorRole" TEXT,
    "event" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditEvent_createdAt_idx" ON "public"."AdminAuditEvent"("createdAt");
CREATE INDEX "AdminAuditEvent_event_createdAt_idx" ON "public"."AdminAuditEvent"("event", "createdAt");
CREATE INDEX "AdminAuditEvent_entityType_entityId_createdAt_idx" ON "public"."AdminAuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AdminAuditEvent_actorUserId_createdAt_idx" ON "public"."AdminAuditEvent"("actorUserId", "createdAt");

ALTER TABLE "public"."AdminAuditEvent"
  ADD CONSTRAINT "AdminAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
