import type { SessionContext } from "@blitzjs/auth"
import { revokeCurrentSession } from "./session"

export async function logoutCurrentUser(session?: SessionContext | null) {
  return revokeCurrentSession(session)
}
