import { sendEmail } from "@/integrations/email"

type ResetPasswordMailer = {
  to: string
  token: string
}

export function forgotPasswordMailer({ to, token }: ResetPasswordMailer) {
  // In production, set APP_ORIGIN to your production server origin
  const origin = process.env.APP_ORIGIN || process.env.BLITZ_DEV_SERVER_ORIGIN
  const resetUrl = `${origin}/reset-password?token=${token}`

  const html = `
      <h1>Reset Your Password</h1>
      <p>Use the link below to set a new password for your account.</p>
      <p>This link expires in 4 hours.</p>
      <a href="${resetUrl}">Set a new password</a>
    `

  return {
    async send() {
      await sendEmail({
        to,
        subject: "Your password reset instructions",
        html,
        text: `Reset your password: ${resetUrl}`,
      })
    },
  }
}
