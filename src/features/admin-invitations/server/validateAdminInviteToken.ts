"use server"

import { createHash } from "crypto"
import db from "db"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export async function validateAdminInviteToken(input: { token: string; email?: string }) {
  const hashedToken = hashToken(input.token)
  const now = new Date()

  const invite = await db.adminInvite.findUnique({
    where: { token: hashedToken },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      redeemedAt: true,
      revokedAt: true,
    },
  })

  if (!invite) {
    return { valid: false, error: "Invalid invite token" }
  }

  if (invite.redeemedAt) {
    return { valid: false, error: "This invite has already been redeemed" }
  }

  if (invite.revokedAt) {
    return { valid: false, error: "This invite has been revoked" }
  }

  if (invite.expiresAt <= now) {
    return { valid: false, error: "This invite has expired" }
  }

  if (input.email && invite.email.toLowerCase() !== input.email.toLowerCase()) {
    return { valid: false, error: "Email does not match the invite" }
  }

  return {
    valid: true,
    inviteEmail: invite.email,
    expiresAt: invite.expiresAt,
  }
}
