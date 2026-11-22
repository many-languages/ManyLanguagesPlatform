import { sendEmail } from "@/integrations/email"
import { adminInviteLink } from "./adminInviteLink"

type adminInvitationMailerType = {
  to: string
  token: string
  expiresAt: Date
  /** The email already has a researcher account: link to the accept page instead of signup. */
  existingAccount?: boolean
}

export function adminInvitationMailer({
  to,
  token,
  expiresAt,
  existingAccount = false,
}: adminInvitationMailerType) {
  const inviteLink = adminInviteLink(token, existingAccount)

  const html = existingAccount
    ? `
      <h1>Admin Invitation</h1>
      <p>You have been invited to become an admin of the ManyLanguagesPlatform.</p>
      <p>You already have an account with this email. Log in and accept the invitation to add the admin role to it. Your researcher account and studies stay as they are, and you can switch between the two roles.</p>
      <p>This link expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.</p>
      <a href="${inviteLink}">Accept the admin invitation</a>
    `
    : `
      <h1>Admin Invitation</h1>
      <p>You have been invited to sign up as an admin to the ManyLanguagesPlatform.</p>
      <p>Use the link below to redeem your invitation.</p>
      <p>This link expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.</p>
      <a href="${inviteLink}">Sign up as an admin</a>
    `

  return {
    async send() {
      await sendEmail({
        to,
        subject: "Admin Invitation",
        html,
        text: `Admin invitation: ${inviteLink}`,
      })
    },
  }
}
