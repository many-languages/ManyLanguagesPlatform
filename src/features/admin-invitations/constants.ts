export const ADMIN_INVITE_EXISTING_ACCOUNT_ERROR =
  "An account with this email already exists. Log in to accept the admin invitation."

/** Where an invitee accepts an admin invitation with an account they already have. */
export const ADMIN_INVITE_ACCEPT_PATH = "/admin-invite/accept"

/**
 * Path (with query) of the link that redeems an invitation: the accept page for emails that
 * already have a researcher account, the signup page for new ones. Prefix with the app origin.
 */
export function adminInvitePath(token: string, existingAccount: boolean): string {
  return existingAccount
    ? `${ADMIN_INVITE_ACCEPT_PATH}?token=${encodeURIComponent(token)}`
    : `/signup?adminInvite=${encodeURIComponent(token)}`
}
