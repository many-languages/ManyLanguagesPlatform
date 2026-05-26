import type { SessionContext } from "@blitzjs/auth"
import { AuthorizationError } from "blitz"

/** After `$authorize()`, returns a definite user id or throws. */
export function getAuthorizedUserId(session: SessionContext): number {
  const userId = session.userId
  if (userId == null) {
    throw new AuthorizationError()
  }
  return userId
}
