import { sendEmail } from "@/integrations/email"

type reminderAdminInvitationMailerType = {
  to: string
  token: string
  expiresAt: Date
}

export function reminderAdminInvitationMailer({
  to,
  token,
  expiresAt,
}: reminderAdminInvitationMailerType) {
  // In production, set APP_ORIGIN to your production server origin
  const origin = process.env.APP_ORIGIN || process.env.BLITZ_DEV_SERVER_ORIGIN
  const inviteLink = `${origin}/signup?adminInvite=${token}`

  const html = `
      <h1>Admin Invitation</h1>
      <p>You have been invited to sign up as an admin.</p>
      <p>Use the link below to redeem your invitation.</p>
      <p>This link expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.</p>
      <a href="${inviteLink}">Sign up as an admin</a>
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
