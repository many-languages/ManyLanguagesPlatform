"use server"

import { createHash, randomBytes } from "crypto"
import db from "db"
import { recordAdminAuditEvent } from "@/src/lib/audit/adminAudit"
import { requireSuperAdminSession } from "./authorization"
import { getAdminInviteEmailStatus } from "./getAdminInviteEmailStatus"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export type RegenerateAdminInviteLinkResult =
  | {
      ok: true
      email: string
      expiresAt: Date
      token: string
      /** True when the invitee already has a researcher account and accepts by logging in. */
      existingAccount: boolean
    }
  | { ok: false; error: string }

/**
 * Gives a superadmin a usable link for a pending invite.
 *
 * Invite tokens are stored only as a hash, so the original token can never be shown again. This
 * issues a fresh one instead (like a reminder does, but without emailing), which means the
 * previously sent link stops working. The new token is returned once and is not stored readably.
 */
export async function regenerateAdminInviteLink(
  inviteId: number
): Promise<RegenerateAdminInviteLinkResult> {
  const session = await requireSuperAdminSession()
  const now = new Date()

  const invite = await db.adminInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, email: true, expiresAt: true, redeemedAt: true, revokedAt: true },
  })

  if (!invite) return { ok: false, error: "Invite not found" }
  if (invite.redeemedAt) return { ok: false, error: "This invite has already been redeemed" }
  if (invite.revokedAt) return { ok: false, error: "This invite has been revoked" }
  if (invite.expiresAt <= now) {
    return { ok: false, error: "This invite has expired. Create a new invite instead." }
  }

  // The email's account may have changed since the invite was created (e.g. it became a
  // participant), in which case no link could be redeemed.
  const emailStatus = await getAdminInviteEmailStatus(invite.email)
  if (!emailStatus.eligible) return { ok: false, error: emailStatus.message }

  const plainToken = randomBytes(32).toString("base64url")

  // Conditional on the invite still being usable, so a concurrent accept/revoke wins.
  const updated = await db.adminInvite.updateMany({
    where: { id: invite.id, redeemedAt: null, revokedAt: null, expiresAt: { gt: now } },
    data: { token: hashToken(plainToken) },
  })
  if (updated.count !== 1) return { ok: false, error: "This invite is no longer available" }

  await recordAdminAuditEvent({
    actorUserId: session.userId,
    actorRole: session.role,
    event: "admin_invite_link_regenerated",
    entityType: "AdminInvite",
    entityId: invite.id,
  })

  return {
    ok: true,
    email: invite.email,
    expiresAt: invite.expiresAt,
    token: plainToken,
    existingAccount: emailStatus.kind === "existing-researcher",
  }
}
