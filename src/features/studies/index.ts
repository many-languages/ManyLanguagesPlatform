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
