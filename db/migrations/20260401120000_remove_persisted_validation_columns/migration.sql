-- Drop persisted validation state for codebook and feedback templates.
-- Validation is now computed on demand from approved extraction + current content.

-- Drop relation constraints first.
ALTER TABLE "FeedbackTemplate" DROP CONSTRAINT IF EXISTS "FeedbackTemplate_validatedExtractionId_fkey";
ALTER TABLE "Codebook" DROP CONSTRAINT IF EXISTS "Codebook_validatedExtractionId_fkey";

-- Remove columns from FeedbackTemplate.
ALTER TABLE "FeedbackTemplate"
DROP COLUMN IF EXISTS "validatedExtractionId",
DROP COLUMN IF EXISTS "validationStatus",
DROP COLUMN IF EXISTS "validatedAt",
DROP COLUMN IF EXISTS "missingVariableNames",
DROP COLUMN IF EXISTS "extraVariableNames",
DROP COLUMN IF EXISTS "extractorVersion";

-- Remove columns from Codebook.
ALTER TABLE "Codebook"
DROP COLUMN IF EXISTS "validatedExtractionId",
DROP COLUMN IF EXISTS "validationStatus",
DROP COLUMN IF EXISTS "validatedAt",
DROP COLUMN IF EXISTS "missingKeys",
DROP COLUMN IF EXISTS "extraKeys",
DROP COLUMN IF EXISTS "extractorVersion";

-- Cleanup enum no longer referenced.
DROP TYPE IF EXISTS "ValidationStatus";
