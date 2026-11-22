import { createHash } from "crypto"
import type { SessionContext } from "@blitzjs/auth"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import db, { UserRole } from "db"
import { ADMIN_INVITE_EXISTING_ACCOUNT_ERROR } from "@/src/features/admin-invitations/constants"
import { validateAdminInviteToken } from "@/src/features/admin-invitations/server/validateAdminInviteToken"
import { ensureResearcherProvisioned } from "@/src/lib/jatos/tokenBroker"
import { createAuthenticatedSession } from "./session"
import { SignupWithAdminInvite } from "../validations"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

class AdminInviteRedemptionError extends Error {
  name = "AdminInviteRedemptionError"
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ])
}

export async function signupUser(
  input: { email: string; password: string; role: UserRole; adminInviteToken?: string },
  session?: SessionContext | null
) {
  const { email, password, role, adminInviteToken } = SignupWithAdminInvite.parse(input)

  try {
    let finalRole = role
    let hashedAdminInviteToken: string | null = null

    if (adminInviteToken) {
      const validation = await validateAdminInviteToken({ token: adminInviteToken, email })

      if (!validation.valid) {
        return { error: validation.error || "Invalid admin invite token" }
      }

      if (validation.existingAccount) {
        // A new account can't take over an email that already has one; the owner accepts the
        // invite from their existing account instead (see acceptAdminInvite).
        return { error: ADMIN_INVITE_EXISTING_ACCOUNT_ERROR }
      }

      if (validation.inviteEmail?.toLowerCase() !== email.toLowerCase()) {
        return { error: "Email does not match the admin invite" }
      }

      finalRole = UserRole.ADMIN
      hashedAdminInviteToken = hashToken(adminInviteToken)
    } else if (role === UserRole.ADMIN) {
      return { error: "Admin role requires a valid invite token" }
    }

    const hashedPassword = await withTimeout(
      SecurePassword.hash(password),
      10000,
      "Password hashing timed out after 10 seconds"
    )

    const user = await db.$transaction(async (tx) => {
      // Create the user first so the invite can record who redeemed it. Both writes share one
      // transaction: a duplicate email or an invite that is no longer available rolls back both.
      const createdUser = await tx.user.create({
        data: { email, hashedPassword, roles: [finalRole] },
      })

      if (hashedAdminInviteToken) {
        const result = await tx.adminInvite.updateMany({
          where: {
            token: hashedAdminInviteToken,
            redeemedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { redeemedAt: new Date(), redeemedById: createdUser.id },
        })

        if (result.count !== 1) {
          throw new AdminInviteRedemptionError("Admin invite is no longer available")
        }
      }

      return createdUser
    })

    if (finalRole === UserRole.RESEARCHER || finalRole === UserRole.ADMIN) {
      try {
        await ensureResearcherProvisioned(user.id)
      } catch (error) {
        console.warn("JATOS provisioning failed at signup:", error)
      }
    }

    await createAuthenticatedSession(user.id, finalRole, session)

    const { hashedPassword: userHashedPassword, ...createdUser } = user
    void userHashedPassword

    return { user: createdUser, activeRole: finalRole }
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return { error: "This email is already being used" }
    }

    if (error instanceof AdminInviteRedemptionError) {
      return { error: "This invite has already been redeemed, revoked, or expired" }
    }

    throw error
  }
}
