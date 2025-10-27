"use client"

import styles from "../../styles/Home.module.css"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import logout from "../../mutations/logout"

export function LogoutButton() {
  const router = useRouter()
  const [logoutMutation] = useMutation(logout)
  return (
    <>
      <button
        className={styles.button}
        onClick={async () => {
          await logoutMutation()
          router.refresh()
        }}
      >
        Logout
      </button>
    </>
  )
}
