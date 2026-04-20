import type { UserRole } from "@/db"
import AdminSummaryCard from "./cards/AdminSummaryCard"
import StaleAdminInvitesCard from "./cards/StaleAdminInvitesCard"
import PendingAdminApprovalCard from "./cards/PendingAdminApprovalCard"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import type { StudySummaryCounts } from "@/src/app/admin/studies/queries/getAdminStudyCounts"
import type { StalePendingAdminInvite } from "../admin-data/getStalePendingAdminInvites"
import type { PendingAdminApprovalStudyRow } from "../admin-data/getPendingAdminApprovalStudies"

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
    </section>
  )
}
