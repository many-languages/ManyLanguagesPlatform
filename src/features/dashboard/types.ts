import type { StudySummaryCounts } from "@/src/features/studies"

/** Minimal user shape consumed by the portal dashboard composition. */
export type DashboardCurrentUser = {
  id: number
  firstname: string | null
  lastname: string | null
  username: string | null
  email: string
  role: string
  gravatar: string | null
  createdAt: Date
} | null

export type ResearcherStudyCounts = StudySummaryCounts

export type ActiveStudyWithResponseCount = {
  id: number
  title: string
  sampleSize: number
  responseCount: number
}

export type DeadlineStudy = {
  id: number
  title: string
  startDate: Date
  endDate: Date
  daysOffset: number
  isSetupComplete: boolean
}

export type UpcomingDeadlines = {
  endingSoon: DeadlineStudy[]
  startingSoon: DeadlineStudy[]
  recentlyPastEnd: DeadlineStudy[]
}

export type ParticipantIncompleteStudy = {
  id: number
  title: string
  endDate: Date
  daysUntilDeadline: number
  participationId: number
  completionStatus: "incomplete" | "unknown"
  isPastDeadline: boolean
}

export type ParticipantIncompleteStudies = {
  nearingDeadline: ParticipantIncompleteStudy[]
  passedDeadline: ParticipantIncompleteStudy[]
}

export type ParticipantStudyCounts = {
  all: number
  notCompleted: number
  completedNotPaid: number
  toExplore: number
}

export type ParticipantCompletedNotPaidStudy = {
  id: number
  title: string
  payment: string
  completedAt: Date
  endDate: Date
}
