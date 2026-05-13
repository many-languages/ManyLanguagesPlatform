"use server"

import { AuthorizationError } from "blitz"
import type { UserRole } from "@/db"
import { getAuthorizedSession } from "@/src/lib/auth/session"

export async function requireDashboardUser(role: UserRole): Promise<number> {
  const session = await getAuthorizedSession()

  if (session.userId == null || session.role !== role) {
    throw new AuthorizationError()
  }

  return session.userId
}
