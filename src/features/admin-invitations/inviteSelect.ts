/**
 * Shared Prisma `select` shape for admin invite rows. Used by admin invite
 * server loaders so list and dashboard surfaces stay in lockstep when columns
 * are added.
 *
 * Lives at the feature root because this select is shared feature data, not a
 * server loader or transport entrypoint.
 */
export const inviteSelect = {
  id: true,
  email: true,
  expiresAt: true,
  redeemedAt: true,
  revokedAt: true,
  reminderSentAt: true,
  createdAt: true,
  createdById: true,
} as const
