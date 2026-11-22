"use client"

import { useMutation } from "@blitzjs/rpc"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import logout from "@/src/features/auth/mutations/logout"

/** Logs out and returns to the login form, which then sends the user back to `returnTo`. */
export function SwitchAccountButton({ returnTo }: { returnTo: string }) {
  const [logoutMutation] = useMutation(logout)

  return (
    <AsyncButton
      onClick={async () => {
        await logoutMutation()
        // Hard navigation drops client state so the previous account's pages can't be shown.
        window.location.assign(`/login?next=${encodeURIComponent(returnTo)}`)
      }}
      loadingText="Logging out"
      className="btn btn-primary"
    >
      Log in with another account
    </AsyncButton>
  )
}
