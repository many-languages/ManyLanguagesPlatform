"use server"

import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isSuperAdmin } from "@/src/lib/auth/roles"

const inviteSelect = {
  id: true,
  email: true,
  expiresAt: true,
  redeemedAt: true,
  revokedAt: true,
  reminderSentAt: true,
  createdAt: true,
  createdById: true,
} as const

const getAdminInvites = resolver.pipe(resolver.authorize("SUPERADMIN"), async () => {
  return db.adminInvite.findMany({
    select: inviteSelect,
    orderBy: { createdAt: "desc" },
  })
})

export async function getAdminInvitesRsc() {
  const session = await getAuthorizedSession()
  if (!isSuperAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return db.adminInvite.findMany({
    select: inviteSelect,
    orderBy: { createdAt: "desc" },
  })
}

export default getAdminInvites
