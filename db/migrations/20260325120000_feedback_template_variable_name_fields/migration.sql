-- Rename FeedbackTemplate JSON columns to reflect variableName semantics (vs StudyVariable.variableKey).

ALTER TABLE "FeedbackTemplate" RENAME COLUMN "requiredVariableKeys" TO "requiredVariableNames";
ALTER TABLE "FeedbackTemplate" RENAME COLUMN "missingKeys" TO "missingVariableNames";
ALTER TABLE "FeedbackTemplate" RENAME COLUMN "extraKeys" TO "extraVariableNames";
