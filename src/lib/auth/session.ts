"use server"

import type { SessionContext } from "@blitzjs/auth"
import { AuthorizationError } from "blitz"
import { getBlitzContext } from "@/src/app/blitz-server"

/** After `$authorize()`, returns a definite user id or throws. */
export function getAuthorizedUserId(session: SessionContext): number {
  const userId = session.userId
  if (userId == null) {
    throw new AuthorizationError()
  }
  return userId
}

function assertSessionContext(session: unknown): asserts session is SessionContext {
  if (
    session == null ||
    typeof session !== "object" ||
    !("$authorize" in session) ||
    typeof (session as SessionContext).$authorize !== "function"
  ) {
    throw new Error("Invalid Blitz session context")
  }
}

export async function getSessionContext(): Promise<SessionContext> {
  const { session } = await getBlitzContext()
  assertSessionContext(session)
  return session
}

export async function getAuthorizedSession(): Promise<SessionContext> {
  const session = await getSessionContext()
  session.$authorize()
  return session
}
