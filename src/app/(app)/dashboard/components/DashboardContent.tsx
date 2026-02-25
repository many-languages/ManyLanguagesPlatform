"use client"

import DashboardNotificationsCard from "./DashboardNotificationsCard"
import DashboardResearcherSummaryCard from "./DashboardResearcherSummaryCard"
import type { ResearcherStudyCounts } from "../queries/getResearcherStudyCounts"

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
}

export default function DashboardContent({ currentUser, researcherCounts }: DashboardContentProps) {
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
        <DashboardNotificationsCard />
      </div>
    </main>
  )
}
