import { getBlitzContext } from "@/src/app/blitz-server"
import {
  AdminDashboard,
  getPendingAdminApprovalStudiesForDashboardRsc,
  getStalePendingAdminInvitesRsc,
} from "@/src/features/dashboard"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { getAdminStudyCounts } from "../studies/queries/getAdminStudyCounts"

export const metadata = {
  title: "Admin Console",
  description: "High-level controls for ManyLanguagesPlatform administrators",
}

export default async function AdminHomePage() {
  const { session } = await getBlitzContext()
  const studyCounts = await getAdminStudyCounts()

  const staleAdminInvites =
    session.role === "SUPERADMIN" ? await getStalePendingAdminInvitesRsc().catch(() => []) : []

  const pendingAdminApprovalStudies = isStaffAdmin(session.role)
    ? await getPendingAdminApprovalStudiesForDashboardRsc().catch(() => [])
    : []

  return (
    <AdminDashboard
      role={session.role}
      studyCounts={studyCounts}
      staleAdminInvites={staleAdminInvites}
      pendingAdminApprovalStudies={pendingAdminApprovalStudies}
    />
  )
}
