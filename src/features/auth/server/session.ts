import type { SessionContext } from "@blitzjs/auth"
import type { UserRole } from "db"
import { getSessionContext } from "@/src/lib/auth/session"

export async function resolveSessionContext(
  session?: SessionContext | null
): Promise<SessionContext> {
  if (session) {
    return session
  }

  return getSessionContext()
}

export async function createAuthenticatedSession(
  userId: number,
  role: UserRole,
  session?: SessionContext | null
) {
  const activeSession = await resolveSessionContext(session)
  await activeSession.$create({ userId, role })
}

export async function revokeCurrentSession(session?: SessionContext | null) {
  const activeSession = await resolveSessionContext(session)
  return activeSession.$revoke()
}
