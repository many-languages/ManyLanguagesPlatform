"use client"

import { useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { useMutation } from "@blitzjs/rpc"
import { Alert } from "@/src/components/ui/Alert"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import { usePendingNavigation } from "@/src/lib/hooks/usePendingNavigation"
import { DEFAULT_ADMIN_PATH } from "@/src/lib/auth/routing"
import acceptAdminInvite from "../mutations/acceptAdminInvite"

interface AcceptAdminInviteCardProps {
  token: string
  email: string
  /** Where "cancel" goes: the dashboard of the role the user is currently acting as. */
  homePath: Route
}

export function AcceptAdminInviteCard({ token, email, homePath }: AcceptAdminInviteCardProps) {
  const [acceptMutation] = useMutation(acceptAdminInvite)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const { replace } = usePendingNavigation()

  const handleAccept = async () => {
    setError(null)
    try {
      const result = await acceptMutation({ token })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Soft navigation into the admin area, which has its own layout and navbar.
      setAccepted(true)
      replace(DEFAULT_ADMIN_PATH)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not accept the invitation. Please try again."
      )
    }
  }

  return (
    <div className="space-y-4 w-full">
      <h1 className="font-black text-3xl">Admin invitation</h1>

      <div className="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 space-y-3">
        <p>
          You have been invited to become an admin with <strong>{email}</strong>.
        </p>
        <p className="text-sm text-base-content/70">
          Your researcher account and your studies stay exactly as they are. Accepting adds the
          admin role to this account, and you can switch between researcher and admin from the
          account menu at any time.
        </p>
        <p className="text-sm text-base-content/70">
          As an admin you review studies, but you can&apos;t approve or reject a study you are a
          researcher on. Another admin has to review those.
        </p>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-2 pt-2">
          <AsyncButton
            onClick={handleAccept}
            loadingText="Accepting"
            className="btn btn-primary"
            disabled={accepted}
          >
            Accept invitation
          </AsyncButton>
          <Link className="btn btn-ghost" href={homePath}>
            Not now
          </Link>
        </div>
      </div>
    </div>
  )
}
