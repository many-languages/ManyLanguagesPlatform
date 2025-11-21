export const metadata = {
  title: "Admin Invites",
}

import Card from "@/src/app/components/Card"
import { AdminInviteForm } from "./components/AdminInviteForm"
import AdminInviteManagementCard from "./components/AdminInviteManagementCard"
import { getAdminInvitesRsc } from "./queries/getAdminInvites"

export default async function AdminInvitesPage() {
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
