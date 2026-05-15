"use server"

import type { SessionContext } from "@blitzjs/auth"
import { AuthorizationError } from "blitz"
import { isSuperAdmin } from "@/src/lib/auth/roles"
import { getAuthorizedSession } from "@/src/lib/auth/session"

export async function requireSuperAdminSession(): Promise<SessionContext> {
  const session = await getAuthorizedSession()
  if (!isSuperAdmin(session.role)) {
    throw new AuthorizationError()
  }
  return session
}
