"use server"

import type { SessionContext } from "@blitzjs/auth"
import { getBlitzContext } from "@/src/app/blitz-server"

export const getAuthorizedSession = async (): Promise<SessionContext> => {
  const { session } = (await getBlitzContext()) as { session: SessionContext }
  session.$authorize()
  return session
}
