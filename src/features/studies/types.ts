/**
 * Study-centric types surfaced through `@/src/features/studies` (Phase 9).
 */

export type { StudyWithRelations } from "./queries/getStudy"
export type { StudyWithLatestUpload } from "./queries/getStudies"
export type { AdminStudyWithLatestUpload } from "./queries/getAdminStudies"
export type { StudySummaryCounts } from "./domain/studySummaryCounts"
export type { StudyView } from "./domain/studyView"
export type { ParticipantStudyView } from "./domain/participantStudyView"
export type { StudyWithMinimalRelations, SetupStepFlags } from "./domain/setup/setupStatus"
export type { PendingAdminApprovalStudyRow } from "./queries/getPendingAdminApprovalStudies"
