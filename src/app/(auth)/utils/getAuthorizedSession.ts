"use server"

import type { SessionContext } from "@blitzjs/auth"
import { getBlitzContext } from "@/src/app/blitz-server"

export const getAuthorizedSession = async (): Promise<SessionContext> => {
  const blitzContext = await getBlitzContext()
  const session: SessionContext = blitzContext.session as SessionContext
  session.$authorize()
  return session
}
