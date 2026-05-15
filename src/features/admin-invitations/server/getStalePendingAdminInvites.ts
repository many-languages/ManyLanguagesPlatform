"use server"

import db from "db"
import { inviteSelect } from "../inviteSelect"
import { requireSuperAdminSession } from "./authorization"

const DEFAULT_STALE_ADMIN_INVITE_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000

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
export async function getStalePendingAdminInvitesRsc(
  minAgeMs = DEFAULT_STALE_ADMIN_INVITE_MIN_AGE_MS
) {
  await requireSuperAdminSession()

  return findStalePendingAdminInvites(minAgeMs)
}

export type StalePendingAdminInvite = Awaited<
  ReturnType<typeof getStalePendingAdminInvitesRsc>
>[number]
