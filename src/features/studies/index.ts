/**
 * Public barrel for `@/src/features/studies` — see `docs/refactor/studies-feature-migration.md` §6.7.
 * Server actions / RPC resolvers are not re-exported here (ADR-003).
 */

export type {
  AdminStudyCodebookEntryDto,
  AdminStudyLatestUploadDto,
  AdminStudyListItemDto,
  ParticipantStudyView,
  ParticipantWithEmail,
  PendingAdminApprovalStudyRow,
  SetupStepFlags,
  ParticipantStudyOverview,
  StudySummaryCounts,
  StudyView,
  StudyWithLatestUpload,
  StudyWithMinimalRelations,
  StudyWithRelations,
} from "./types"
export { getStudySummaryCounts } from "./server/studySummaryCounts"
export {
  studyHasParticipantResponses,
  studyHasParticipantResponsesSafe,
  assertStudyArchiveAllowed,
  assertStudyDeleteAllowedByResponses,
  assertStudyNotArchived,
} from "./server"
export {
  ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE,
  canEditStudySetup,
  studyArchivedBlocksSetupWrite,
} from "./domain/studyEditability"

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
export { getStudyVariablesRsc } from "./server/getStudyVariables"

/** Setup wizard — pure domain + in-memory caches (Phase 4). */
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

/** Cross-feature services */
export {
  withStudyAccess,
  withStudyWriteAccess,
  verifyResearcherStudyAccess,
  getAllPilotResultsRsc,
  getSetupCompletionRsc,
} from "./services"
export type { PilotResultsContext } from "./services"

/** Study views — parsers + enums (minimal relations come from `./types`). */
export { STUDY_VIEWS, parseStudyView } from "./domain/studyView"
export { PARTICIPANT_STUDY_VIEWS, parseParticipantStudyView } from "./domain/participantStudyView"

/** RSC helpers for routes & cross-feature callers */
export { getParticipantStudyOverviewRsc, getStudyPageRsc, getStudyRsc } from "./server/getStudy"
export { getStudies } from "./server/getStudies"
export { getParticipantStudiesWithStatus } from "./server/getParticipantStudiesWithStatus"
export {
  getResearcherStudiesPageSlice,
  STUDIES_LIST_PAGE_SIZE,
  RESEARCHER_STUDIES_MAX_SETUP_FILTER,
} from "./server/getResearcherStudiesPageSlice"
export { loadStudySetupPage } from "./server/loadStudySetupPage"
export type { StudySetupPageContext } from "./server/loadStudySetupPage"
export { getValidationDataRsc } from "./server/getValidationData"
export type { ValidationData } from "./server/getValidationData"
export { getStudiesRsc } from "./server/getAdminStudies"
export { getAdminStudyCounts } from "./server/getAdminStudyCounts"
export { getPendingAdminApprovalStudiesForDashboardRsc } from "./server/getPendingAdminApprovalStudies"

/** Shared UI */
export { default as StudyHeader } from "./ui/shared/StudyHeader"
export { default as StudyList } from "./ui/shared/StudyList"
export { default as StudyItem } from "./ui/shared/StudyItem"
export { default as StudiesViewTabs } from "./ui/shared/StudiesViewTabs"
export { default as ParticipantStudiesViewTabs } from "./ui/shared/ParticipantStudiesViewTabs"
export { default as StudyLifecycleActions } from "./ui/shared/StudyLifecycleActions"
export type { StudyLifecycleActionsProps } from "./ui/shared/StudyLifecycleActions"
export {
  default as StudySummaryCard,
  RESEARCHER_STUDY_SUMMARY_LINKS,
  ADMIN_STUDY_SUMMARY_LINKS,
} from "./ui/shared/StudySummaryCard"
export type { StudySummaryLinks } from "./ui/shared/StudySummaryCard"

/** UI — researcher */
export { default as ResearcherData } from "./ui/researcher/ResearcherData"
export { default as StudyInformationCard } from "./ui/shared/StudyInformationCard"
export { default as StudyStatusControl } from "./ui/researcher/StudyStatusControl"
export { default as StudySummary } from "./ui/researcher/StudySummary"
export { default as ResultsCard } from "./ui/researcher/ResultsCard"
export { default as ResultsCardWrapper } from "./ui/researcher/ResultsCardWrapper"
export { default as CreateStudyButton } from "./ui/researcher/CreateStudyButton"
export { default as SetupProgressCard } from "./ui/researcher/setup/SetupProgressCard"
export { default as StepIndicator } from "./ui/researcher/setup/StepIndicator"
export { default as SetupContentSkeleton } from "./ui/researcher/setup/SetupContentSkeleton"
export { default as SetupStepHeader } from "./ui/researcher/setup/SetupStepHeader"
export { default as Step1Content } from "./ui/researcher/setup/step1/Step1Content"
export { default as Step2Content } from "./ui/researcher/setup/step2/Step2Content"
export { default as Step3Content } from "./ui/researcher/setup/step3/Step3Content"
export { default as Step4Content } from "./ui/researcher/setup/step4/Step4Content"
export { default as Step5Content } from "./ui/researcher/setup/step5/Step5Content"
export { default as Step6Content } from "./ui/researcher/setup/step6/Step6Content"
export { default as DebugContent } from "./ui/researcher/inspector/DebugContent"

/** UI — participant */
export { default as ParticipantData } from "./ui/participant/ParticipantData"
export { default as JoinStudyButton } from "./ui/participant/JoinStudyButton"

/** UI — admin */
export { default as AdminStudyManagementCard } from "./ui/admin/AdminStudyManagementCard"

/** Skeletons */
export { default as StudiesSkeleton } from "./ui/shared/StudiesSkeleton"
export { default as StudySkeleton } from "./ui/shared/StudySkeleton"
export { default as StudyFormSkeleton } from "./ui/shared/StudyFormSkeleton"
export { default as StudyListSkeleton } from "./ui/shared/StudyListSkeleton"
export { default as PaginationControlsSkeleton } from "./ui/shared/PaginationControlsSkeleton"
export { default as ExploreSkeleton } from "./ui/shared/ExploreSkeleton"
