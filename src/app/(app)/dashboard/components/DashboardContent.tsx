"use client"

import DashboardNotificationsCard from "./DashboardNotificationsCard"
import DashboardResearcherSummaryCard from "./DashboardResearcherSummaryCard"
import DashboardActiveStudiesCard from "./DashboardActiveStudiesCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"
import type { ActiveStudyWithResponseCount } from "../queries/getActiveStudiesWithResponseCounts"

type CurrentUser = {
  id: number
  firstname: string | null
  lastname: string | null
  username: string | null
  email: string
  role: string
  gravatar: string | null
  createdAt: Date
} | null

interface DashboardContentProps {
  currentUser: CurrentUser
  researcherCounts: ResearcherStudyCounts | null
  activeStudiesWithResponses: ActiveStudyWithResponseCount[]
}

export default function DashboardContent({
  currentUser,
  researcherCounts,
  activeStudiesWithResponses,
}: DashboardContentProps) {
  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">
        Welcome{" "}
        {currentUser?.firstname && currentUser?.lastname
          ? `${currentUser.firstname} ${currentUser.lastname}`
          : currentUser?.username || ""}
      </h1>

      <div className="max-w-2xl mx-auto mt-6 space-y-6">
        {researcherCounts && <DashboardResearcherSummaryCard counts={researcherCounts} />}
        {activeStudiesWithResponses.length > 0 && (
          <DashboardActiveStudiesCard studies={activeStudiesWithResponses} />
        )}
        <DashboardNotificationsCard />
      </div>
    </main>
  )
}
