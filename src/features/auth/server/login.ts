import type { SessionContext } from "@blitzjs/auth"
import { pickInitialRole } from "@/src/lib/auth/roles"
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

  // Accounts holding several roles start as the highest one and can switch from the navbar.
  const activeRole = pickInitialRole(authResult.user.roles)
  await createAuthenticatedSession(authResult.user.id, activeRole, session)

  return { user: authResult.user, activeRole }
}
