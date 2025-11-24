"use client"

import { useMemo, useState } from "react"
import Card from "@/src/app/components/Card"
import Form from "@/src/app/components/Form"
import CheckboxFieldTable from "@/src/app/(app)/studies/components/CheckboxFieldTable"
import { FormErrorDisplay } from "@/src/app/components/FormErrorDisplay"
import { AdminInviteSchema, AdminInviteFormValues } from "../validations"
import revokeAdminInvites from "../mutations/revokeAdminInvites"
import sendAdminInviteReminders from "../mutations/sendAdminInviteReminders"
import { useFormContext } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"

type InviteLite = {
  id: number
  email: string
  createdAt: Date
  expiresAt: Date
  redeemedAt: Date | null
  revokedAt: Date | null
  reminderSentAt: Date | null
}

export default function AdminInviteManagementCard({ invites }: { invites: InviteLite[] }) {
  const rows = useMemo(() => {
    return invites.map((invite) => {
      const expires = invite.expiresAt ? new Date(invite.expiresAt) : null
      const created = invite.createdAt ? new Date(invite.createdAt) : null
      const redeemed = invite.redeemedAt ? new Date(invite.redeemedAt) : null
      const revoked = invite.revokedAt ? new Date(invite.revokedAt) : null
      const reminderSent = invite.reminderSentAt ? new Date(invite.reminderSentAt) : null

      let status: "pending" | "redeemed" | "revoked" | "expired" = "pending"
      if (revoked) status = "revoked"
      else if (redeemed) status = "redeemed"
      else if (expires && expires.getTime() < Date.now()) status = "expired"

      return {
        id: invite.id,
        label: invite.email,
        createdAt: created?.toLocaleString() ?? "—",
        expiresAt: expires?.toLocaleString() ?? "—",
        reminderSentAt: reminderSent?.toLocaleString() ?? "No reminder sent yet",
        status,
      }
    })
  }, [invites])

  const columns = useMemo(
    () => [
      {
        id: "email",
        header: "Email",
        accessorKey: "label",
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "createdAt",
      },
      {
        id: "expiresAt",
        header: "Expires",
        accessorKey: "expiresAt",
      },
      {
        id: "reminderSentAt",
        header: "Last Reminder",
        accessorKey: "reminderSentAt",
        cell: ({ row }: any) => {
          const reminderSent = row.original.reminderSentAt as string
          return (
            <span className={reminderSent === "No reminder sent yet" ? "text-base-content/50" : ""}>
              {reminderSent}
            </span>
          )
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: any) => {
          const status = row.original.status as string
          const badgeClass =
            status === "pending"
              ? "badge badge-info"
              : status === "redeemed"
              ? "badge badge-success"
              : status === "revoked"
              ? "badge badge-error"
              : "badge badge-warning"
          return <span className={badgeClass}>{status}</span>
        },
      },
    ],
    []
  )

  return (
    <Form<typeof AdminInviteSchema>
      schema={AdminInviteSchema}
      defaultValues={{ selectedInviteIds: [] }}
      onSubmit={async () => {}}
    >
      <Card
        title="Admin Invite Management"
        bgColor="bg-base-100"
        className="mt-4"
        actions={<InviteActions />}
      >
        <CheckboxFieldTable
          name="selectedInviteIds"
          options={rows.map((row) => ({ id: row.id, label: row.label }))}
          extraData={rows}
          extraColumns={columns}
        />
        <FormErrorDisplay />
      </Card>
    </Form>
  )
}

function InviteActions() {
  const router = useRouter()
  const { watch, setValue, trigger } = useFormContext<AdminInviteFormValues>()
  const [revokeMutation] = useMutation(revokeAdminInvites)
  const [sendReminderMutation] = useMutation(sendAdminInviteReminders)
  const [isRevoking, setIsRevoking] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)

  const handleRevoke = async () => {
    const ids = watch("selectedInviteIds")
    const valid = await trigger("selectedInviteIds")
    if (!valid) return
    try {
      setIsRevoking(true)
      const result = await revokeMutation({ inviteIds: ids })
      toast.success(`Revoked ${result.revoked} invite(s)`)
      setValue("selectedInviteIds", [])
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke invites."
      toast.error(message)
    } finally {
      setIsRevoking(false)
    }
  }

  const handleSendReminder = async () => {
    const ids = watch("selectedInviteIds")
    const valid = await trigger("selectedInviteIds")
    if (!valid) return
    try {
      setIsSendingReminder(true)
      const result = await sendReminderMutation({ inviteIds: ids })

      // Show appropriate messages based on results
      if (result.sent > 0) {
        toast.success(`Sent ${result.sent} reminder(s)`)
      }

      if (result.skipped > 0) {
        const reasons = result.skippedEmails.map((s) => `${s.email} (${s.reason})`).join(", ")
        toast.error(`Skipped ${result.skipped} invite(s): ${reasons}`, { duration: 5000 })
      }

      if (result.failed > 0) {
        toast.error(
          `Failed to send ${result.failed} reminder(s): ${result.failedEmails.join(", ")}`,
          { duration: 5000 }
        )
      }

      if (result.sent === 0 && result.skipped > 0 && result.failed === 0) {
        // All invites were skipped, no need to refresh
        return
      }

      setValue("selectedInviteIds", [])
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reminders."
      toast.error(message)
    } finally {
      setIsSendingReminder(false)
    }
  }

  const isSubmitting = isRevoking || isSendingReminder

  return (
    <div className="flex gap-2 justify-end">
      <button
        type="button"
        className="btn btn-error btn-outline"
        disabled={isSubmitting}
        onClick={handleRevoke}
      >
        {isRevoking ? "Revoking..." : "Revoke invite"}
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-outline"
        disabled={isSubmitting}
        onClick={handleSendReminder}
      >
        {isSendingReminder ? "Sending..." : "Send reminder email"}
      </button>
    </div>
  )
}
