"use server"

import { resolver } from "@blitzjs/rpc"
import { createHash } from "crypto"
import { z } from "zod"
import db from "db"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

const ValidateAdminInviteToken = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email().optional(),
})

export default resolver.pipe(resolver.zod(ValidateAdminInviteToken), async ({ token, email }) => {
  const hashedToken = hashToken(token)
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

  // If email is provided, verify it matches the invite
  if (email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return { valid: false, error: "Email does not match the invite" }
  }

  return {
    valid: true,
    inviteEmail: invite.email,
    expiresAt: invite.expiresAt,
  }
})

// RSC helper for server components
export async function validateAdminInviteTokenRsc(token: string, email?: string) {
  const { default: validateToken } = await import("./validateAdminInviteToken")
  return validateToken({ token, email }, { session: null } as any)
}
