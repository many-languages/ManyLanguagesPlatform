import { resolver } from "@blitzjs/rpc"
import db, { UserRole } from "db"
import { Login } from "../validations"
import { SecurePassword } from "@blitzjs/auth/secure-password"

export const authenticateUser = async (rawEmail: string, rawPassword: string) => {
  const { email, password } = Login.parse({ email: rawEmail, password: rawPassword })
  const user = await db.user.findFirst({ where: { email } })

  if (!user) {
    return { error: "Invalid credentials" }
  }

  try {
    const result = await SecurePassword.verify(user.hashedPassword, password)

    if (result === SecurePassword.VALID_NEEDS_REHASH) {
      // Upgrade hashed password with a more secure hash
      const improvedHash = await SecurePassword.hash(password)
      await db.user.update({ where: { id: user.id }, data: { hashedPassword: improvedHash } })
    }

    const { hashedPassword, ...rest } = user
    return { user: rest }
  } catch (error) {
    // SecurePassword.verify throws AuthenticationError for invalid passwords
    return { error: "Invalid credentials" }
  }
}

export default resolver.pipe(resolver.zod(Login), async ({ email, password }, ctx) => {
  const authResult = await authenticateUser(email, password)

  if (authResult.error) {
    return { error: authResult.error }
  }

  if (!authResult.user) {
    throw new Error("Authentication failed - user not found")
  }

  await ctx.session.$create({ userId: authResult.user.id, role: authResult.user.role as UserRole })
  return { user: authResult.user }
})
