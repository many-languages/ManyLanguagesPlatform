"use client"

import Link from "next/link"
import Card from "@/src/components/ui/Card"
import { ADMIN_INVITE_ACCEPT_PATH } from "../constants"

/**
 * Dashboard hint for a researcher with a pending admin invitation. Accepting needs the token from
 * the invitation email, so the button leads to the accept page, which also takes a pasted token.
 */
export default function PendingAdminInviteCard({ expiresAt }: { expiresAt: Date }) {
  return (
    <Card
      title="Admin invitation"
      bgColor="bg-base-300"
      actions={
        <Link href={ADMIN_INVITE_ACCEPT_PATH} className="btn btn-primary">
          Accept invitation
        </Link>
      }
    >
      <div className="space-y-2">
        <p>You have been invited to become an admin of the platform.</p>
        <p className="text-sm text-base-content/70">
          Accepting keeps your researcher account and studies, and lets you switch between the two
          roles. Use the link in your invitation email, or paste its token on the next page. The
          invitation expires on{" "}
          <span suppressHydrationWarning>{new Date(expiresAt).toLocaleString()}</span>.
        </p>
      </div>
    </Card>
  )
}
