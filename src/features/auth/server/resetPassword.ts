import { hash256 } from "@blitzjs/auth"
import type { SessionContext } from "@blitzjs/auth"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import db from "db"
import { createAuthenticatedSession } from "./session"
import { ResetPassword } from "../validations"

export class ResetPasswordError extends Error {
  name = "ResetPasswordError"

  constructor(message: string = "Reset password link is invalid or it has expired.") {
    super(message)
    this.message = message
  }
}

export async function resetPassword(
  input: { password: string; passwordConfirmation: string; token?: string },
  session?: SessionContext | null
) {
  const { password, token } = ResetPassword.parse(input)

  if (!token) {
    throw new ResetPasswordError("Token is required")
  }

  const hashedToken = hash256(token)
  const savedToken = await db.token.findFirst({
    where: { hashedToken, type: "RESET_PASSWORD" },
    include: { user: true },
  })

  if (!savedToken) {
    throw new ResetPasswordError()
  }

  await db.token.delete({ where: { id: savedToken.id } })

  if (savedToken.expiresAt < new Date()) {
    throw new ResetPasswordError()
  }

  const hashedPassword = await SecurePassword.hash(password)
  const user = await db.user.update({
    where: { id: savedToken.userId },
    data: { hashedPassword },
  })

  await db.session.deleteMany({ where: { userId: user.id } })
  await createAuthenticatedSession(user.id, user.role, session)

  return true
}
