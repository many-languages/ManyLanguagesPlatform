"use client"

import { useCallback, useMemo, useState } from "react"
import Card from "@/src/components/ui/Card"
import Form from "@/src/components/ui/Form"
import CheckboxFieldTable from "@/src/components/ui/CheckboxFieldTable"
import { FormErrorDisplay } from "@/src/components/ui/FormErrorDisplay"
import { ConfirmButton } from "@/src/components/ui/ConfirmButton"
import { adminInvitePath } from "../constants"
import { getAdminInviteStatus } from "../inviteStatus"
import { AdminInviteSchema, AdminInviteFormValues } from "../validations"
import { AdminInviteLinkPanel, type GeneratedInviteLink } from "./AdminInviteLinkPanel"
import regenerateAdminInviteLink from "../mutations/regenerateAdminInviteLink"
import revokeAdminInvites from "../mutations/revokeAdminInvites"
import sendAdminInviteReminders from "../mutations/sendAdminInviteReminders"
import { useFormContext } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import StatusBadge from "@/src/components/ui/StatusBadge"
import { getInviteStatusProps } from "@/src/lib/utils/statusBadgePresets"

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
  const [regenerateMutation] = useMutation(regenerateAdminInviteLink)
  const [generated, setGenerated] = useState<GeneratedInviteLink | null>(null)

  // Tokens are stored only as a hash, so an existing invite's token can't be shown again. This
  // issues a fresh one, which replaces the link that was emailed.
  const handleNewLink = useCallback(
    async (inviteId: number) => {
      try {
        const result = await regenerateMutation({ inviteId })
        if (!result.ok) {
          toast.error(result.error, { duration: 5000 })
          return
        }
        setGenerated({
          email: result.email,
          token: result.token,
          link: `${window.location.origin}${adminInvitePath(result.token, result.existingAccount)}`,
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create a new link.")
      }
    },
    [regenerateMutation]
  )

  const rows = useMemo(() => {
    return invites.map((invite) => {
      const expires = invite.expiresAt ? new Date(invite.expiresAt) : null
      const created = invite.createdAt ? new Date(invite.createdAt) : null
      const reminderSent = invite.reminderSentAt ? new Date(invite.reminderSentAt) : null

      const status = getAdminInviteStatus({
        redeemedAt: invite.redeemedAt ? new Date(invite.redeemedAt) : null,
        revokedAt: invite.revokedAt ? new Date(invite.revokedAt) : null,
        expiresAt: new Date(invite.expiresAt),
      })

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
          const props = getInviteStatusProps(
            row.original.status as "pending" | "redeemed" | "revoked" | "expired"
          )
          return <StatusBadge {...props} />
        },
      },
      {
        id: "link",
        header: "Link",
        cell: ({ row }: any) =>
          row.original.status === "pending" ? (
            <ConfirmButton
              // Inside the table's <form>, where the default type would submit it and show a
              // "select at least one invite" error.
              type="button"
              onConfirm={() => handleNewLink(row.original.id as number)}
              confirmMessage={`Create a new link for ${row.original.label}? The link that was emailed to them will stop working.`}
              loadingText="Creating"
              className="btn btn-xs btn-outline"
            >
              New link
            </ConfirmButton>
          ) : (
            <span className="text-base-content/40">—</span>
          ),
      },
    ],
    [handleNewLink]
  )

  return (
    <Form<typeof AdminInviteSchema>
      schema={AdminInviteSchema}
      defaultValues={{ selectedInviteIds: [] }}
      onSubmit={async () => {}}
    >
      <Card
        title="Invite Management"
        bgColor="bg-base-100"
        className="mt-4"
        actions={<InviteActions />}
      >
        {generated && (
          <AdminInviteLinkPanel generated={generated} onDismiss={() => setGenerated(null)} />
        )}
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

      if (result.revoked > 0) {
        toast.success(`Revoked ${result.revoked} invite(s)`)
      }

      if (result.skipped > 0) {
        const reasons = result.skippedEmails.map((s) => `${s.email} (${s.reason})`).join(", ")
        toast.error(`Skipped ${result.skipped} invite(s): ${reasons}`, { duration: 6000 })
      }

      if (result.revoked === 0) {
        // Nothing changed, so keep the selection and skip the refresh.
        return
      }

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
