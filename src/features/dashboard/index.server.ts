// Server-only entry point. Do not import from client components — see `./index.ts` for the client-safe surface.

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
export { getPendingAdminApprovalStudiesForDashboardRsc } from "@/src/features/studies/index.server"
