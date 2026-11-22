import type { SessionContext } from "@blitzjs/auth"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedUserId } from "@/src/lib/auth/getAuthorizedUserId"
import { canSwitchToRole } from "@/src/lib/auth/roles"
import { resolveSessionContext } from "./session"
import { SwitchActiveRole } from "../validations"

/**
 * Changes which of the account's roles the current session acts as. The account's roles are read
 * from the database on every call, so a role the user does not hold can never be selected, and only
 * this session changes — other devices keep whatever role they are using.
 */
export async function switchActiveRole(input: { role: string }, session?: SessionContext | null) {
  const activeSession: SessionContext = await resolveSessionContext(session)
  activeSession.$authorize()
  const userId = getAuthorizedUserId(activeSession)
  const { role } = SwitchActiveRole.parse(input)

  if (activeSession.role === role) {
    return { activeRole: role }
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { roles: true } })
  if (!user || !canSwitchToRole(user.roles, activeSession.role, role)) {
    throw new AuthorizationError("Your account does not have that role.")
  }

  await activeSession.$setPublicData({ role })

  return { activeRole: role }
}
