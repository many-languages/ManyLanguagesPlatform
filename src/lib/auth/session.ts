"use server"

import type { SessionContext } from "@blitzjs/auth"
import { getBlitzContext } from "@/src/app/blitz-server"

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
  const session: SessionContext = await getSessionContext()
  session.$authorize()
  return session
}
