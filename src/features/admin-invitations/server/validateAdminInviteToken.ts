"use server"

import { createHash } from "crypto"
import db from "db"
import { describeAdminInviteIneligibility, getAdminInviteEligibility } from "@/src/lib/auth/roles"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export type AdminInviteValidation =
  | { valid: false; error: string }
  | {
      valid: true
      inviteEmail: string
      expiresAt: Date
      /** True when the email already has a (researcher) account: log in to accept instead of signing up. */
      existingAccount: boolean
    }

export async function validateAdminInviteToken(input: {
  token: string
  email?: string
}): Promise<AdminInviteValidation> {
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

  // User emails are stored lowercased and trimmed; invites may have been created before that.
  const existingUser = await db.user.findUnique({
    where: { email: invite.email.trim().toLowerCase() },
    select: { roles: true },
  })

  const eligibility = getAdminInviteEligibility(existingUser?.roles)
  if (!eligibility.eligible) {
    return { valid: false, error: describeAdminInviteIneligibility(eligibility.reason) }
  }

  return {
    valid: true,
    inviteEmail: invite.email,
    expiresAt: invite.expiresAt,
    existingAccount: eligibility.kind === "existing-researcher",
  }
}
