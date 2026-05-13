"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import logout from "../../mutations/logout"

export function LogoutButton() {
  const router = useRouter()
  const [logoutMutation] = useMutation(logout)

  return (
    <button
      className="btn btn-primary"
      onClick={async () => {
        await logoutMutation()
        router.refresh()
      }}
    >
      Logout
    </button>
  )
}
