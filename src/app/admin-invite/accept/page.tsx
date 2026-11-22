export const metadata = {
  title: "Accept admin invitation",
}

import Link from "next/link"
import type { Route } from "next"
import { redirect } from "next/navigation"
import { getBlitzContext } from "@/src/app/blitz-server"
import { Alert } from "@/src/components/ui/Alert"
import { ADMIN_INVITE_ACCEPT_PATH } from "@/src/features/admin-invitations/constants"
import { validateAdminInviteToken } from "@/src/features/admin-invitations/server/validateAdminInviteToken"
import { AcceptAdminInviteCard } from "@/src/features/admin-invitations/ui/AcceptAdminInviteCard"
import { EnterAdminInviteToken } from "@/src/features/admin-invitations/ui/EnterAdminInviteToken"
import { SwitchAccountButton } from "@/src/features/admin-invitations/ui/SwitchAccountButton"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import { getDefaultAuthenticatedPath } from "@/src/lib/auth/routing"

export default async function AcceptAdminInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token: rawToken } = await searchParams
  const token = typeof rawToken === "string" ? rawToken : ""

  const { session } = await getBlitzContext()
  const home = getDefaultAuthenticatedPath(session.role) as Route

  // Accepting changes the account, so it needs a login. Come back here afterwards.
  if (!session.userId && !token) {
    redirect(`/login?next=${encodeURIComponent(ADMIN_INVITE_ACCEPT_PATH)}` as Route)
  }

  // Logged in but without the emailed link (e.g. arrived from the dashboard): paste the token.
  if (!token) {
    return <EnterAdminInviteToken homePath={home} />
  }

  if (!session.userId) {
    const returnTo = `${ADMIN_INVITE_ACCEPT_PATH}?token=${encodeURIComponent(token)}`
    redirect(`/login?next=${encodeURIComponent(returnTo)}` as Route)
  }

  const [validation, currentUser] = await Promise.all([
    validateAdminInviteToken({ token }),
    getCurrentUserRsc(),
  ])

  if (!validation.valid) {
    return (
      <div className="space-y-4 w-full">
        <h1 className="font-black text-3xl">Admin invitation</h1>
        <Alert variant="error">{validation.error}</Alert>
        <Link className="btn" href={home}>
          Back to the platform
        </Link>
      </div>
    )
  }

  const inviteEmail = validation.inviteEmail.trim().toLowerCase()

  if (!currentUser || currentUser.email.toLowerCase() !== inviteEmail) {
    return (
      <div className="space-y-4 w-full">
        <h1 className="font-black text-3xl">Admin invitation</h1>
        <Alert variant="warning" title="Wrong account">
          This invitation was sent to <strong>{validation.inviteEmail}</strong>, but you are logged
          in as <strong>{currentUser?.email ?? "another account"}</strong>. Log in with the invited
          account to accept it.
        </Alert>
        <SwitchAccountButton
          returnTo={`${ADMIN_INVITE_ACCEPT_PATH}?token=${encodeURIComponent(token)}`}
        />
      </div>
    )
  }

  return <AcceptAdminInviteCard token={token} email={validation.inviteEmail} homePath={home} />
}
