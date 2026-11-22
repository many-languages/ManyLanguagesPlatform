export type AdminInviteStatus = "pending" | "redeemed" | "revoked" | "expired"

/**
 * Where an invite stands. Redeemed wins over everything: once someone has accepted, the invite is
 * spent and its account has admin access, whatever else was later recorded on the row. This is the
 * same order the server checks when validating, accepting, reminding or renewing an invite.
 */
export function getAdminInviteStatus(
  invite: { redeemedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date()
): AdminInviteStatus {
  if (invite.redeemedAt) return "redeemed"
  if (invite.revokedAt) return "revoked"
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired"
  return "pending"
}
