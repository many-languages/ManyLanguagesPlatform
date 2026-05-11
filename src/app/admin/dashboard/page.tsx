import type { UserRole } from "@/db"
import { getBlitzContext } from "@/src/app/blitz-server"
import {
  AdminDashboard,
  getPendingAdminApprovalStudiesForDashboardRsc,
} from "@/src/features/dashboard"
import { getStalePendingAdminInvitesRsc } from "@/src/features/admin-invitations"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { getAdminStudyCounts } from "@/src/features/studies"

export const metadata = {
  title: "Admin Console",
  description: "High-level controls for ManyLanguagesPlatform administrators",
}

export default async function AdminHomePage() {
  const { session } = await getBlitzContext()
  const role = session.role as UserRole
  const studyCounts = await getAdminStudyCounts()

  const staleAdminInvites =
    role === "SUPERADMIN" ? await getStalePendingAdminInvitesRsc().catch(() => []) : []

  const pendingAdminApprovalStudies = isStaffAdmin(role)
    ? await getPendingAdminApprovalStudiesForDashboardRsc().catch(() => [])
    : []

  return (
    <AdminDashboard
      role={role}
      studyCounts={studyCounts}
      staleAdminInvites={staleAdminInvites}
      pendingAdminApprovalStudies={pendingAdminApprovalStudies}
    />
  )
}
