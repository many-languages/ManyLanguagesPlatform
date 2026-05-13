import { AuthenticationError, NotFoundError } from "blitz"
import type { SessionContext } from "@blitzjs/auth"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import db from "db"
import { authenticateUser } from "./authenticateUser"
import { resolveSessionContext } from "./session"
import { ChangePassword } from "../validations"

export async function changePassword(
  input: { currentPassword: string; newPassword: string },
  session?: SessionContext | null
) {
  const { currentPassword, newPassword } = ChangePassword.parse(input)
  const activeSession: SessionContext = await resolveSessionContext(session)
  activeSession.$authorize()

  const user = await db.user.findFirst({ where: { id: activeSession.userId } })
  if (!user) {
    throw new NotFoundError()
  }

  const authResult = await authenticateUser(user.email, currentPassword)
  if (authResult.error || !authResult.user) {
    throw new AuthenticationError("Current password is invalid")
  }

  const hashedPassword = await SecurePassword.hash(newPassword)
  await db.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  })

  return true
}
