import type { SessionContext } from "@blitzjs/auth"
import { authenticateUser } from "./authenticateUser"
import { createAuthenticatedSession } from "./session"
import { Login } from "../validations"

export async function loginUser(
  input: { email: string; password: string },
  session?: SessionContext | null
) {
  const { email, password } = Login.parse(input)
  const authResult = await authenticateUser(email, password)

  if (authResult.error) {
    return { error: authResult.error }
  }

  if (!authResult.user) {
    throw new Error("Authentication failed - user not found")
  }

  await createAuthenticatedSession(authResult.user.id, authResult.user.role, session)

  return { user: authResult.user }
}
