import type { UserRole } from "@/db"
import AdminSummaryCard from "./cards/AdminSummaryCard"
import StaleAdminInvitesCard from "./cards/StaleAdminInvitesCard"
import PendingAdminApprovalCard from "./cards/PendingAdminApprovalCard"
import NotificationsCard from "./cards/NotificationsCard"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import type { PendingAdminApprovalStudyRow, StudySummaryCounts } from "@/src/features/studies"
import type { StalePendingAdminInvite } from "@/src/features/admin-invitations"

interface AdminDashboardProps {
  role: UserRole
  studyCounts: StudySummaryCounts
  staleAdminInvites: StalePendingAdminInvite[]
  pendingAdminApprovalStudies: PendingAdminApprovalStudyRow[]
}

export default function AdminDashboard({
  role,
  studyCounts,
  staleAdminInvites,
  pendingAdminApprovalStudies,
}: AdminDashboardProps) {
  const isSuperAdmin = role === "SUPERADMIN"
  const showPendingApprovalCard = isStaffAdmin(role)

  return (
    <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {isSuperAdmin && <StaleAdminInvitesCard invites={staleAdminInvites} />}
      {showPendingApprovalCard && (
        <PendingAdminApprovalCard studies={pendingAdminApprovalStudies} />
      )}
      <AdminSummaryCard counts={studyCounts} />
      <NotificationsCard variant="admin" />
    </section>
  )
}
