"use server"

import { resolver } from "@blitzjs/rpc"
import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isSuperAdmin } from "@/src/lib/auth/roles"
import { inviteSelect } from "../inviteSelect"

const STALE_ADMIN_INVITE_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000

async function findStalePendingAdminInvites(minAgeMs: number) {
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

/** Pending admin invites that are still valid but older than `minAgeMs` (default: 3 days). */
export async function getStalePendingAdminInvitesRsc(minAgeMs = STALE_ADMIN_INVITE_MIN_AGE_MS) {
  const session = await getAuthorizedSession()
  if (!isSuperAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return findStalePendingAdminInvites(minAgeMs)
}

const getStalePendingAdminInvites = resolver.pipe(resolver.authorize("SUPERADMIN"), async () =>
  findStalePendingAdminInvites(STALE_ADMIN_INVITE_MIN_AGE_MS)
)

export default getStalePendingAdminInvites

export type StalePendingAdminInvite = Awaited<
  ReturnType<typeof getStalePendingAdminInvitesRsc>
>[number]
