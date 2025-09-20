import db, { UserRole } from "db"
import { SecurePassword } from "@blitzjs/auth/secure-password"

export default async function signup(
  input: { password: string; email: string; role: UserRole },
  ctx: any
) {
  const blitzContext = ctx
  const hashedPassword = await SecurePassword.hash((input.password as string) || "test-password")
  const email = (input.email as string) || "test" + Math.random() + "@test.com"
  const role = input.role
  const user = await db.user.create({
    data: { email, hashedPassword, role },
  })

  await blitzContext.session.$create({
    userId: user.id,
    role: "user",
  })

  return { userId: blitzContext.session.userId, ...user, email: input.email, role: role }
}
