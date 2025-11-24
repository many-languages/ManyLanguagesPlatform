import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db, { UserRole } from "db"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import { Signup } from "../validations"
import { createHash } from "crypto"
import validateAdminInviteToken from "@/src/app/(admin)/admin/invitations/queries/validateAdminInviteToken"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

// Helper to add timeout to async operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ])
}

const SignupWithToken = Signup.extend({
  adminInviteToken: z.string().optional(),
})

export default resolver.pipe(
  resolver.zod(SignupWithToken),
  async ({ email, password, role, adminInviteToken }, ctx) => {
    try {
      // Security: Only allow ADMIN role if valid token is provided
      let finalRole = role
      let inviteId: number | null = null

      if (adminInviteToken) {
        // Validate the admin invite token
        const validation = await validateAdminInviteToken({ token: adminInviteToken, email }, ctx)

        if (!validation.valid) {
          return { error: validation.error || "Invalid admin invite token" }
        }

        // Security: Token is valid, enforce ADMIN role and email match
        if (validation.inviteEmail?.toLowerCase() !== email.toLowerCase()) {
          return { error: "Email does not match the admin invite" }
        }

        finalRole = UserRole.ADMIN

        // Find the invite to mark it as redeemed
        const hashedToken = hashToken(adminInviteToken)
        const invite = await db.adminInvite.findUnique({
          where: { token: hashedToken },
          select: { id: true },
        })
        inviteId = invite?.id || null
      } else {
        // Security: Prevent ADMIN role assignment without token
        if (role === UserRole.ADMIN) {
          return { error: "Admin role requires a valid invite token" }
        }
      }

      const hashedPassword = await withTimeout(
        SecurePassword.hash(password),
        10000, // 10 second timeout
        "Password hashing timed out after 10 seconds"
      )

      const user = await db.user.create({
        data: { email, hashedPassword, role: finalRole },
      })

      // Mark invite as redeemed if it was used
      if (inviteId) {
        await db.adminInvite.update({
          where: { id: inviteId },
          data: { redeemedAt: new Date() },
        })
      }

      await ctx.session.$create({
        userId: user.id,
        role: finalRole,
      })

      return { user: { ...user, email, role: finalRole } }
    } catch (error: any) {
      // Handle Prisma unique constraint error for duplicate email
      if (error.code === "P2002" && error.meta?.target?.includes("email")) {
        return { error: "This email is already being used" }
      }

      // For other errors, throw them (unknown errors)
      throw error
    }
  }
)
