-- Add Study indexes for admin lists, researcher status filters, and cron lifecycle scans.
CREATE INDEX "Study_createdAt_idx" ON "public"."Study"("createdAt");
CREATE INDEX "Study_archived_status_createdAt_idx" ON "public"."Study"("archived", "status", "createdAt");
CREATE INDEX "Study_archived_status_adminApproved_startDate_endDate_idx" ON "public"."Study"("archived", "status", "adminApproved", "startDate", "endDate");
