"use server"

import db from "db"
import { getAdminInviteStatus } from "../inviteStatus"
import { requireSuperAdminSession } from "./authorization"

const SKIP_REASON = {
  redeemed: "already redeemed, so the account keeps its admin access",
  revoked: "already revoked",
  expired: "already expired",
} as const

/**
 * Cancels invites that could still be used. Revoking only blocks the invite's token: it never
 * touches an account, so a redeemed invite is skipped rather than "revoked", which would wrongly
 * suggest the person's admin access was removed.
 */
export async function revokeAdminInvites(inviteIds: number[]) {
  await requireSuperAdminSession()
  const now = new Date()

  const invites = await db.adminInvite.findMany({
    where: { id: { in: inviteIds } },
    select: { id: true, email: true, expiresAt: true, redeemedAt: true, revokedAt: true },
  })

  const pendingIds: number[] = []
  const skippedEmails: { email: string; reason: string }[] = []

  for (const invite of invites) {
    const status = getAdminInviteStatus(invite, now)
    if (status === "pending") {
      pendingIds.push(invite.id)
    } else {
      skippedEmails.push({ email: invite.email, reason: SKIP_REASON[status] })
    }
  }

  // Conditional on the invite still being unused, so an accept that lands in between wins.
  const result = await db.adminInvite.updateMany({
    where: { id: { in: pendingIds }, redeemedAt: null, revokedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now },
  })

  return { revoked: result.count, skipped: skippedEmails.length, skippedEmails }
}
