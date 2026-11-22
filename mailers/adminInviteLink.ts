import { adminInvitePath } from "@/src/features/admin-invitations/constants"

/** Link in an admin invitation email: signup for new accounts, the accept page for existing ones. */
export function adminInviteLink(token: string, existingAccount: boolean): string {
  // In production, set APP_ORIGIN to your production server origin
  const origin = process.env.APP_ORIGIN || process.env.BLITZ_DEV_SERVER_ORIGIN
  return `${origin}${adminInvitePath(token, existingAccount)}`
}
