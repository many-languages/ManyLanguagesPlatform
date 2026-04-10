import StudySummaryCard, { ADMIN_STUDY_SUMMARY_LINKS } from "@/src/app/components/StudySummaryCard"
import { getBlitzContext } from "@/src/app/blitz-server"
import DashboardStaleAdminInvitesCard from "@/src/app/(app)/dashboard/components/DashboardStaleAdminInvitesCard"
import { getStalePendingAdminInvitesRsc } from "@/src/app/(admin)/admin/invitations/queries/getAdminInvites"
import { getAdminStudyCounts } from "./studies/queries/getAdminStudyCounts"

export const metadata = {
  title: "Admin Console",
  description: "High-level controls for ManyLanguagesPlatform administrators",
}

export default async function AdminHomePage() {
  const { session } = await getBlitzContext()
  const counts = await getAdminStudyCounts()

  const staleAdminInvites =
    session.role === "SUPERADMIN" ? await getStalePendingAdminInvitesRsc().catch(() => []) : []

  return (
    <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {session.role === "SUPERADMIN" && (
        <DashboardStaleAdminInvitesCard invites={staleAdminInvites} />
      )}
      <StudySummaryCard counts={counts} links={ADMIN_STUDY_SUMMARY_LINKS} />
    </section>
  )
}
