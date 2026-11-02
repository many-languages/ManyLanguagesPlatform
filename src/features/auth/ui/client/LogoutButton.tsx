"use client"

import { useMutation } from "@blitzjs/rpc"
import logout from "../../mutations/logout"

export function LogoutButton() {
  const [logoutMutation] = useMutation(logout)

  return (
    <button
      className="btn btn-primary"
      onClick={async () => {
        await logoutMutation()
        // Hard navigation drops the Next.js router cache and client state.
        window.location.assign("/login")
      }}
    >
      Logout
    </button>
  )
}
