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

const STALE_ADMIN_INVITE_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000

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

/** Pending admin invites that are still valid but older than `minAgeMs` (default from {@link STALE_ADMIN_INVITE_MIN_AGE_MS}). */
export async function getStalePendingAdminInvitesRsc(minAgeMs = STALE_ADMIN_INVITE_MIN_AGE_MS) {
  const session = await getAuthorizedSession()
  if (!isSuperAdmin(session.role)) {
    throw new AuthorizationError()
  }

  const now = new Date()
  const threshold = new Date(now.getTime() - minAgeMs)

  return db.adminInvite.findMany({
    where: {
      redeemedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
      createdAt: { lte: threshold },
    },
    select: inviteSelect,
    orderBy: { createdAt: "asc" },
  })
}

export type StalePendingAdminInvite = Awaited<
  ReturnType<typeof getStalePendingAdminInvitesRsc>
>[number]

export default getAdminInvites
