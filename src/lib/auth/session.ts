"use server"

import type { SessionContext } from "@blitzjs/auth"
import { getBlitzContext } from "@/src/app/blitz-server"

export async function getSessionContext(): Promise<SessionContext> {
  const { session } = await getBlitzContext()
  return session as SessionContext
}

export async function getAuthorizedSession(): Promise<SessionContext> {
  const session: SessionContext = await getSessionContext()
  session.$authorize()
  return session
}
