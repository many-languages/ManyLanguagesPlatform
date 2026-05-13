// UI compositions (what routes render)
export { default as PortalDashboard } from "./ui/PortalDashboard"
export { default as AdminDashboard } from "./ui/AdminDashboard"
export { default as DashboardSkeleton } from "./ui/DashboardSkeleton"

// Shared types
export type {
  ActiveStudyWithResponseCount,
  DashboardCurrentUser,
  DeadlineStudy,
  ParticipantCompletedNotPaidStudy,
  ParticipantIncompleteStudies,
  ParticipantIncompleteStudy,
  ParticipantStudyCounts,
  ResearcherStudyCounts,
  UpcomingDeadlines,
} from "./types"

// Portal server loaders (called directly from `/dashboard`)
export { getResearcherStudyCounts } from "./server/getResearcherStudyCounts"
export { getActiveStudiesWithResponseCounts } from "./server/getActiveStudiesWithResponseCounts"
export { getUpcomingDeadlines } from "./server/getUpcomingDeadlines"
export { getParticipantIncompleteStudies } from "./server/getParticipantIncompleteStudies"
export { getParticipantStudyCounts } from "./server/getParticipantStudyCounts"
export { getParticipantCompletedNotPaidStudies } from "./server/getParticipantCompletedNotPaidStudies"

// Admin queries (called from `/admin/dashboard`)
// `getStalePendingAdminInvitesRsc` was promoted to `features/admin-invitations/` (ADR-003).
// Pending-approval slice lives in `features/studies/`; re-exported here for dashboard callers.
export { getPendingAdminApprovalStudiesForDashboardRsc } from "@/src/features/studies"
export type { PendingAdminApprovalStudyRow } from "@/src/features/studies"
