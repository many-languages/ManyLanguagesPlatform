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

// Server loaders live in `./index.server.ts`; only erased types are re-exported here.
export type { PendingAdminApprovalStudyRow } from "@/src/features/studies"
