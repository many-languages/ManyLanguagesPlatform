import { fallbackOrLoginRedirect } from "@/src/lib/auth/redirectOnAuthenticationError"
import { redirect } from "next/navigation"
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
  if (!session.userId) {
    redirect("/login")
  }
  const role = session.role as UserRole

  const [studyCounts, staleAdminInvites, pendingAdminApprovalStudies] = await Promise.all([
    getAdminStudyCounts(),
    role === "SUPERADMIN"
      ? getStalePendingAdminInvitesRsc().catch(fallbackOrLoginRedirect([]))
      : Promise.resolve([]),
    isStaffAdmin(role)
      ? getPendingAdminApprovalStudiesForDashboardRsc().catch(fallbackOrLoginRedirect([]))
      : Promise.resolve([]),
  ])

  return (
    <AdminDashboard
      role={role}
      studyCounts={studyCounts}
      staleAdminInvites={staleAdminInvites}
      pendingAdminApprovalStudies={pendingAdminApprovalStudies}
    />
  )
}
