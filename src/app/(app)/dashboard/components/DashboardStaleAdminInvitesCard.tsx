"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import Card from "@/src/app/components/Card"
import sendAdminInviteReminders from "@/src/app/(admin)/admin/invitations/mutations/sendAdminInviteReminders"
import type { StalePendingAdminInvite } from "@/src/app/(admin)/admin/invitations/queries/getAdminInvites"

function formatDate(value: StalePendingAdminInvite["createdAt"]) {
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

export default function DashboardStaleAdminInvitesCard({
  invites,
}: {
  invites: StalePendingAdminInvite[]
}) {
  const router = useRouter()
  const [sendReminderMutation] = useMutation(sendAdminInviteReminders)
  const [busyId, setBusyId] = useState<number | null>(null)

  const sendReminder = async (inviteId: number) => {
    try {
      setBusyId(inviteId)
      const result = await sendReminderMutation({ inviteIds: [inviteId] })

      if (result.sent > 0) {
        toast.success(`Reminder sent to ${result.sentEmails[0] ?? "recipient"}`)
        router.refresh()
        return
      }

      if (result.skipped > 0) {
        const reasons = result.skippedEmails.map((s) => `${s.email} (${s.reason})`).join(", ")
        toast.error(`Could not send: ${reasons}`, { duration: 5000 })
        return
      }

      if (result.failed > 0) {
        toast.error(`Failed to send: ${result.failedEmails.join(", ")}`, { duration: 5000 })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reminder."
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card
      title="Stale admin invitations"
      bgColor="bg-base-300"
      actions={
        <Link href="/admin/invitations" className="btn btn-ghost btn-sm">
          All invitations
        </Link>
      }
    >
      <p className="text-sm text-base-content/70 mb-3">
        These pending invites were created at least three days ago and are still unclaimed.
      </p>
      {invites.length === 0 ? (
        <p className="text-base-content/70">No stale invitations right now.</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-base-200/80 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{invite.email}</div>
                <div className="text-xs text-base-content/60">
                  Sent {formatDate(invite.createdAt)}
                  {invite.reminderSentAt ? (
                    <> · Last reminder {formatDate(invite.reminderSentAt)}</>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm shrink-0"
                disabled={busyId !== null}
                onClick={() => sendReminder(invite.id)}
              >
                {busyId === invite.id ? "Sending…" : "Send reminder"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
