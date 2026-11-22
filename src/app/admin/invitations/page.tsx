export const metadata = {
  title: "Admin Invites",
}

import { redirect } from "next/navigation"
import Card from "@/src/components/ui/Card"
import { AdminInviteForm, AdminInviteManagementCard } from "@/src/features/admin-invitations"
import { getAdminInvitesRsc } from "@/src/features/admin-invitations/index.server"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import { isSuperAdmin } from "@/src/lib/auth/roles"
import { DEFAULT_ADMIN_PATH } from "@/src/lib/auth/routing"

export default async function AdminInvitesPage() {
  const { session } = await getBlitzContext()
  // The layout guards a full page load, but not client-side navigation after the session expired;
  // without this check a signed-out visitor would be bounced to the dashboard instead of login.
  if (!session.userId) {
    redirect(await getLoginUrl())
  }
  if (!isSuperAdmin(session.role)) {
    redirect(DEFAULT_ADMIN_PATH)
  }

  const invites = await getAdminInvitesRsc()

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Invite admins</h1>
        <p className="text-base-content/70 max-w-3xl">
          Generate single-use, expiring invite links to onboard additional administrators. Links
          should be shared via secure channels only.
        </p>
      </header>

      <Card title="Create invite" bodyClassName="space-y-4" bgColor="bg-base-100">
        <AdminInviteForm />
      </Card>

      <AdminInviteManagementCard invites={invites} />
    </section>
  )
}
