import { createHash } from "crypto"
import type { SessionContext } from "@blitzjs/auth"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import db, { UserRole } from "db"
import { validateAdminInviteToken } from "@/src/features/admin-invitations/server/validateAdminInviteToken"
import { ensureResearcherProvisioned } from "@/src/lib/jatos/tokenBroker"
import { createAuthenticatedSession } from "./session"
import { SignupWithAdminInvite } from "../validations"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

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
    let inviteId: number | null = null

    if (adminInviteToken) {
      const validation = await validateAdminInviteToken({ token: adminInviteToken, email })

      if (!validation.valid) {
        return { error: validation.error || "Invalid admin invite token" }
      }

      if (validation.inviteEmail?.toLowerCase() !== email.toLowerCase()) {
        return { error: "Email does not match the admin invite" }
      }

      finalRole = UserRole.ADMIN

      const invite = await db.adminInvite.findUnique({
        where: { token: hashToken(adminInviteToken) },
        select: { id: true },
      })
      inviteId = invite?.id ?? null
    } else if (role === UserRole.ADMIN) {
      return { error: "Admin role requires a valid invite token" }
    }

    const hashedPassword = await withTimeout(
      SecurePassword.hash(password),
      10000,
      "Password hashing timed out after 10 seconds"
    )

    const user = await db.user.create({
      data: { email, hashedPassword, role: finalRole },
    })

    if (inviteId) {
      await db.adminInvite.update({
        where: { id: inviteId },
        data: { redeemedAt: new Date() },
      })
    }

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

    return { user: createdUser }
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return { error: "This email is already being used" }
    }

    throw error
  }
}
