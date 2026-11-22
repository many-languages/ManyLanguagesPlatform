"use client"

import { useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { TextInput } from "@/src/components/ui/fields"
import { ADMIN_INVITE_ACCEPT_PATH } from "../constants"

/** For someone who is logged in but arrived without the emailed link: paste the token instead. */
export function EnterAdminInviteToken({ homePath }: { homePath: Route }) {
  const router = useRouter()
  const [token, setToken] = useState("")

  const trimmed = token.trim()

  return (
    <div className="space-y-4 w-full">
      <h1 className="font-black text-3xl">Admin invitation</h1>

      <form
        className="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!trimmed) return
          router.push(`${ADMIN_INVITE_ACCEPT_PATH}?token=${encodeURIComponent(trimmed)}` as Route)
        }}
      >
        <p className="text-sm text-base-content/70">
          Open the link in your invitation email, or paste the invitation token from it here.
        </p>
        <TextInput
          id="adminInviteToken"
          type="text"
          label="Invitation token"
          placeholder="Paste your invitation token here"
          className="w-full font-mono"
          autoComplete="off"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary" disabled={!trimmed}>
            Continue
          </button>
          <Link className="btn btn-ghost" href={homePath}>
            Not now
          </Link>
        </div>
      </form>
    </div>
  )
}
