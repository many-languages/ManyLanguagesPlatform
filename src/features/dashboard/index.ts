// UI compositions (what routes render)
export { default as PortalDashboard } from "./ui/PortalDashboard"
export { default as AdminDashboard } from "./ui/AdminDashboard"
export { default as DashboardSkeleton } from "./ui/DashboardSkeleton"

// Shared types
export type { DashboardCurrentUser } from "./types"

// Portal queries (called directly as server functions from `/dashboard`)
export { getResearcherStudyCounts } from "./queries/getResearcherStudyCounts"
export type { ResearcherStudyCounts } from "./queries/getResearcherStudyCounts"

export { getActiveStudiesWithResponseCounts } from "./queries/getActiveStudiesWithResponseCounts"
export type { ActiveStudyWithResponseCount } from "./queries/getActiveStudiesWithResponseCounts"

export { getUpcomingDeadlines } from "./queries/getUpcomingDeadlines"
export type { UpcomingDeadlines } from "./queries/getUpcomingDeadlines"

export { getParticipantIncompleteStudies } from "./queries/getParticipantIncompleteStudies"
export type { ParticipantIncompleteStudies } from "./queries/getParticipantIncompleteStudies"

export { getParticipantStudyCounts } from "./queries/getParticipantStudyCounts"
export type { ParticipantStudyCounts } from "./queries/getParticipantStudyCounts"

export { getParticipantCompletedNotPaidStudies } from "./queries/getParticipantCompletedNotPaidStudies"
export type { ParticipantCompletedNotPaidStudy } from "./queries/getParticipantCompletedNotPaidStudies"

// Admin queries (called from `/admin/dashboard`)
// `getStalePendingAdminInvitesRsc` was promoted to `features/admin-invitations/` (ADR-003).
// `getPendingAdminApprovalStudiesForDashboardRsc` remains here until Phase 11 moves it into `features/studies/queries/`.
export { getPendingAdminApprovalStudiesForDashboardRsc } from "./admin-data/getPendingAdminApprovalStudies"
export type { PendingAdminApprovalStudyRow } from "./admin-data/getPendingAdminApprovalStudies"
