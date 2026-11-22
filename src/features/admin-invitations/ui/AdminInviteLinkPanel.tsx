"use client"

import { Alert } from "@/src/components/ui/Alert"
import CopyButton from "@/src/components/ui/CopyButton"

export interface GeneratedInviteLink {
  email: string
  link: string
  token: string
}

/**
 * Shows a freshly issued invite link. It exists only in this component's state: leaving or
 * refreshing the page discards it, and "New link" issues another. The token is part of the link, so
 * it is not repeated on screen; "Copy token" is for pasting it into the signup or accept form.
 */
export function AdminInviteLinkPanel({
  generated,
  onDismiss,
}: {
  generated: GeneratedInviteLink
  onDismiss: () => void
}) {
  return (
    <Alert variant="info" onClose={onDismiss} className="mb-4">
      <div className="space-y-2">
        <p>
          <span className="font-semibold text-base-content">New link for {generated.email}.</span>{" "}
          The link sent earlier no longer works. Copy this one now: it is shown only once.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={generated.link}
            aria-label="Invitation link"
            onFocus={(event) => event.currentTarget.select()}
            className="input input-bordered input-sm min-w-0 flex-1 basis-64 font-mono"
          />
          <CopyButton
            getTextToCopy={() => generated.link}
            label="Copy link"
            className="btn btn-sm btn-primary"
          />
          <CopyButton getTextToCopy={() => generated.token} label="Copy token" />
        </div>
      </div>
    </Alert>
  )
}
