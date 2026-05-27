-- Add study-scoped participant lookup index for researcher/admin participant lists.
CREATE INDEX "ParticipantStudy_studyId_createdAt_idx" ON "public"."ParticipantStudy"("studyId", "createdAt");
