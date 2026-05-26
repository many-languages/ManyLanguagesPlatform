import { SecurePassword } from "@blitzjs/auth/secure-password"
import db from "db"
import { Login } from "../validations"
import { authUserWithPasswordSelect, type AuthUserWithPassword } from "../userSelects"

export type AuthenticatedUser = Omit<AuthUserWithPassword, "hashedPassword">

export interface AuthenticateUserResult {
  error?: string
  user?: AuthenticatedUser
}

export async function authenticateUser(
  rawEmail: string,
  rawPassword: string
): Promise<AuthenticateUserResult> {
  const { email, password } = Login.parse({ email: rawEmail, password: rawPassword })
  const user = await db.user.findFirst({
    where: { email },
    select: authUserWithPasswordSelect,
  })

  if (!user) {
    return { error: "Invalid credentials" }
  }

  try {
    const result = await SecurePassword.verify(user.hashedPassword, password)

    if (result === SecurePassword.VALID_NEEDS_REHASH) {
      const improvedHash = await SecurePassword.hash(password)
      await db.user.update({ where: { id: user.id }, data: { hashedPassword: improvedHash } })
    }

    const { hashedPassword, ...authenticatedUser } = user
    void hashedPassword

    return { user: authenticatedUser }
  } catch {
    return { error: "Invalid credentials" }
  }
}
