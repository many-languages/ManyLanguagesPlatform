import { sendEmail } from "@/integrations/email"
import { adminInviteLink } from "./adminInviteLink"

type reminderAdminInvitationMailerType = {
  to: string
  token: string
  expiresAt: Date
  /** The email already has a researcher account: link to the accept page instead of signup. */
  existingAccount?: boolean
}

export function reminderAdminInvitationMailer({
  to,
  token,
  expiresAt,
  existingAccount = false,
}: reminderAdminInvitationMailerType) {
  const inviteLink = adminInviteLink(token, existingAccount)

  const html = `
      <h1>Admin Invitation</h1>
      <p>${
        existingAccount
          ? "You have been invited to become an admin. Log in with your existing account to accept."
          : "You have been invited to sign up as an admin."
      }</p>
      <p>Use the link below to redeem your invitation.</p>
      <p>This link expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.</p>
      <a href="${inviteLink}">${
    existingAccount ? "Accept the admin invitation" : "Sign up as an admin"
  }</a>
    `

  return {
    async send() {
      await sendEmail({
        to,
        subject: "Admin Invitation Reminder",
        html,
        text: `Admin invitation reminder: ${inviteLink}`,
      })
    },
  }
}
