import { resolver } from "@blitzjs/rpc"
import db, { UserRole } from "db"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import { Signup } from "../validations"

// Helper to add timeout to async operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ])
}

export default resolver.pipe(resolver.zod(Signup), async ({ email, password, role }, ctx) => {
  try {
    const hashedPassword = await withTimeout(
      SecurePassword.hash(password),
      10000, // 10 second timeout
      "Password hashing timed out after 10 seconds"
    )

    const user = await db.user.create({
      data: { email, hashedPassword, role },
    })

    await ctx.session.$create({
      userId: user.id,
      role: role,
    })

    return { user: { ...user, email, role } }
  } catch (error: any) {
    // Handle Prisma unique constraint error for duplicate email
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return { error: "This email is already being used" }
    }

    // For other errors, throw them (unknown errors)
    throw error
  }
})
