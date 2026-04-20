/**
 * Shared Prisma `select` shape for admin invite rows. Used by both
 * `queries/getAdminInvites` and `queries/getStalePendingAdminInvites` so the
 * two stay in lockstep when columns are added.
 *
 * Lives at the feature root (not under `queries/`) because Blitz auto-wraps
 * every file in `queries/` as an RPC resolver; plain-data modules must sit
 * outside that folder.
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
