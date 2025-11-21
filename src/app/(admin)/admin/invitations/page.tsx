export const metadata = {
  title: "Admin Invites",
}

import Card from "@/src/app/components/Card"
import { AdminInviteForm } from "./components/AdminInviteForm"

export default function AdminInvitesPage() {
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

      <Card title="Pending invites" bgColor="bg-base-100">
        <p className="text-base-content/70">Wire this to Prisma to list outstanding tokens.</p>
      </Card>
    </section>
  )
}
