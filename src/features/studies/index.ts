/** Public barrel for `features/studies` — extended in later phases (see docs/refactor/studies-feature-migration.md). */

export type { StudySummaryCounts } from "./domain/studySummaryCounts"
export { getStudySummaryCounts } from "./domain/studySummaryCounts"
export {
  studyHasParticipantResponses,
  studyHasParticipantResponsesSafe,
  assertStudyArchiveAllowed,
  assertStudyDeleteAllowedByResponses,
  assertStudyNotArchived,
  ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE,
  canEditStudySetup,
  studyArchivedBlocksSetupWrite,
} from "./domain"

/** Study variables — domain types + extraction (Phase 3). */
export type {
  Diagnostic,
  ExtractedVariable,
  ExtractionBundle,
  ExtractionObservation,
  VariableType,
} from "./domain/variables/types"
export { DEFAULT_EXTRACTION_CONFIG } from "./domain/variables/types"
export {
  extractVariableBundle,
  extractVariableBundleFromResults,
  extractVariableBundleForRender,
  extractVariableBundleForRenderFromResults,
} from "./domain/variables/utils/extractVariable"
export {
  ExtractionIndexStore,
  createExtractionIndexStore,
} from "./domain/variables/utils/extractionIndexStore"
export { observationsToLongCsv } from "./domain/variables/utils/observationsLongCsv"
export { getStudyVariablesRsc } from "./queries/getStudyVariables"

/** Setup wizard — pure domain + in-memory caches (Phase 4). */
export type { StudyWithMinimalRelations, SetupStepFlags } from "./domain/setup/setupStatus"
export {
  isSetupCompleteFromFlags,
  isSetupComplete,
  getIncompleteStep,
  getCompletedSteps,
  getSetupStatusLabel,
  getSetupProgress,
  step6NeedsRevision,
  getNextSetupStepUrl,
  getPostStepNavigationUrl,
} from "./domain/setup/setupStatus"
export type { StudySetupStepQuery } from "./domain/setup/setupRoutes"
export { studyPath, studySetupStepPath, studySetupSegmentPath } from "./domain/setup/setupRoutes"
export type {
  SerializedDiagnostics,
  SerializedExtractionBundle,
} from "./domain/setup/serializeExtractionBundle"
export { serializeExtractionBundle } from "./domain/setup/serializeExtractionBundle"
export { deriveStep1Completed } from "./domain/setup/deriveStep1Completed"
export { STEP_KEYS, STEP_NAMES, TOTAL_STEPS } from "./domain/setup/constants"
export type { ExtractionCacheKeyParts } from "./domain/setup/extractionBundleCache"
export {
  extractionBundleCache,
  buildExtractionCacheKey,
} from "./domain/setup/extractionBundleCache"
export {
  EXTRACTOR_VERSION,
  REQUIRED_KEYS_HASH,
  hashJson,
  buildPilotDatasetHash,
  buildCacheKey,
} from "./domain/setup/extractionCache"

/** Server-side access helpers (Phase 6). */
export { verifyResearcherStudyAccess } from "./server/verifyResearcherStudyAccess"
