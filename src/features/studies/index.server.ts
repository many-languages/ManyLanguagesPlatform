/**
 * Server-only entry point for `@/src/features/studies/index.server`.
 * Do not import from client components — see `./index.ts` for the client-safe surface.
 */
export { getStudySummaryCounts } from "./server/studySummaryCounts"
export {
  studyHasParticipantResponses,
  studyHasParticipantResponsesSafe,
  assertStudyArchiveAllowed,
  assertStudyDeleteAllowedByResponses,
  assertStudyNotArchived,
} from "./server"
export { getStudyVariablesRsc } from "./server/getStudyVariables"

/** Cross-feature services */
export {
  withStudyAccess,
  withStudyWriteAccess,
  verifyResearcherStudyAccess,
  getAllPilotResultsRsc,
  getSetupCompletionRsc,
} from "./services"

/** RSC helpers for routes & cross-feature callers */
export {
  getParticipantStudyOverviewRsc,
  getStudyPageRsc,
  getStudyRsc,
  getStudyViewerRsc,
} from "./server/getStudy"
export { getStudies } from "./server/getStudies"
export {
  getParticipantJoinedByStudyIdRsc,
  isParticipantInStudyRsc,
} from "./server/isParticipantInStudy"
export { getParticipantStudiesWithStatus } from "./server/getParticipantStudiesWithStatus"
export {
  getResearcherStudiesPageSlice,
  STUDIES_LIST_PAGE_SIZE,
  RESEARCHER_STUDIES_MAX_SETUP_FILTER,
} from "./server/getResearcherStudiesPageSlice"
export { loadStudySetupPage } from "./server/loadStudySetupPage"
export { getValidationDataRsc } from "./server/getValidationData"
export { getStudiesRsc } from "./server/getAdminStudies"
export { getAdminStudyCounts } from "./server/getAdminStudyCounts"
export { getPendingAdminApprovalStudiesForDashboardRsc } from "./server/getPendingAdminApprovalStudies"

/** Server components */
export { default as ResearcherData } from "./ui/researcher/ResearcherData"
export { default as ParticipantData } from "./ui/participant/ParticipantData"
