"use client"

import { useMemo, useState } from "react"
import Card from "@/src/app/components/Card"
import Form from "@/src/app/components/Form"
import CheckboxFieldTable from "@/src/app/(app)/studies/components/CheckboxFieldTable"
import { FormErrorDisplay } from "@/src/app/components/FormErrorDisplay"
import { AdminInviteSchema, AdminInviteFormValues } from "../validations"
import revokeAdminInvites from "../mutations/revokeAdminInvites"
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
}

export default function AdminInviteManagementCard({ invites }: { invites: InviteLite[] }) {
  const rows = useMemo(() => {
    return invites.map((invite) => {
      const expires = invite.expiresAt ? new Date(invite.expiresAt) : null
      const created = invite.createdAt ? new Date(invite.createdAt) : null
      const redeemed = invite.redeemedAt ? new Date(invite.redeemedAt) : null
      const revoked = invite.revokedAt ? new Date(invite.revokedAt) : null

      let status: "pending" | "redeemed" | "revoked" | "expired" = "pending"
      if (revoked) status = "revoked"
      else if (redeemed) status = "redeemed"
      else if (expires && expires.getTime() < Date.now()) status = "expired"

      return {
        id: invite.id,
        label: invite.email,
        createdAt: created?.toLocaleString() ?? "—",
        expiresAt: expires?.toLocaleString() ?? "—",
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRevoke = async () => {
    const ids = watch("selectedInviteIds")
    const valid = await trigger("selectedInviteIds")
    if (!valid) return
    try {
      setIsSubmitting(true)
      const result = await revokeMutation({ inviteIds: ids })
      toast.success(`Revoked ${result.revoked} invite(s)`)
      setValue("selectedInviteIds", [])
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke invites."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex gap-2 justify-end">
      <button
        type="button"
        className="btn btn-error btn-outline"
        disabled={isSubmitting}
        onClick={handleRevoke}
      >
        {isSubmitting ? "Revoking..." : "Revoke invite"}
      </button>
      <button type="button" className="btn btn-secondary btn-outline" disabled>
        Send reminder email
      </button>
    </div>
  )
}
