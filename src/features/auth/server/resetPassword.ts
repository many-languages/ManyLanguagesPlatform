import { hash256 } from "@blitzjs/auth"
import type { SessionContext } from "@blitzjs/auth"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import db from "db"
import { createAuthenticatedSession } from "./session"
import { ResetPassword } from "../validations"
import { resetPasswordUserSelect } from "../userSelects"

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
    select: {
      id: true,
      expiresAt: true,
      userId: true,
      user: { select: resetPasswordUserSelect },
    },
  })

  if (!savedToken) {
    throw new ResetPasswordError()
  }

  if (savedToken.expiresAt < new Date()) {
    await db.token.delete({ where: { id: savedToken.id } })
    throw new ResetPasswordError()
  }

  const hashedPassword = await SecurePassword.hash(password)

  const user = await db.$transaction(async (tx) => {
    const consumedToken = await tx.token.deleteMany({
      where: {
        id: savedToken.id,
        expiresAt: { gte: new Date() },
      },
    })

    if (consumedToken.count !== 1) {
      throw new ResetPasswordError()
    }

    const updatedUser = await tx.user.update({
      where: { id: savedToken.userId },
      data: { hashedPassword },
    })

    await tx.session.deleteMany({ where: { userId: updatedUser.id } })

    return updatedUser
  })

  await createAuthenticatedSession(user.id, user.role, session)

  return true
}
