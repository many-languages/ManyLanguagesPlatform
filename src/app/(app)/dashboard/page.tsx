import { Suspense } from "react"
import { getBlitzContext } from "../../blitz-server"
import { getCurrentUserRsc } from "../../users/queries/getCurrentUser"
import { getResearcherStudyCounts } from "./queries/getResearcherStudyCounts"
import DashboardContent from "./components/DashboardContent"
import DashboardSkeleton from "./components/DashboardSkeleton"

export default async function DashboardPage() {
  const { session } = await getBlitzContext()

  // Fetch user data server-side (will be cached if already fetched in layout)
  const currentUser = session.userId ? await getCurrentUserRsc().catch(() => null) : null

  // Fetch researcher study counts only for researchers
  const researcherCounts =
    currentUser?.role === "RESEARCHER" && session.userId
      ? await getResearcherStudyCounts(session.userId).catch(() => null)
      : null

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent currentUser={currentUser} researcherCounts={researcherCounts} />
    </Suspense>
  )
}
