import { createHash } from "crypto"
import type { SessionContext } from "@blitzjs/auth"
import db, { UserRole } from "db"
import { resolveSessionContext } from "@/src/features/auth/server/session"
import { getAuthorizedUserId } from "@/src/lib/auth/getAuthorizedUserId"
import { describeAdminInviteIneligibility, getAdminInviteEligibility } from "@/src/lib/auth/roles"
import { ensureResearcherProvisioned } from "@/src/lib/jatos/tokenBroker"
import { AcceptAdminInviteSchema, type AcceptAdminInviteInput } from "../validations"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

export type AcceptAdminInviteResult =
  | { ok: true; activeRole: UserRole }
  | { ok: false; error: string }

class AcceptAdminInviteError extends Error {
  name = "AcceptAdminInviteError"
}

/**
 * Lets the owner of an existing researcher account accept an admin invitation: the account gains
 * the ADMIN role (keeping RESEARCHER), the invite is redeemed, and the current session switches to
 * ADMIN.
 *
 * Possessing the emailed token is required, not just a matching email: signup does not verify
 * email ownership, so a matching account email alone proves nothing.
 *
 * Participants are never promoted — enforced here, not only in the UI.
 */
export async function acceptAdminInvite(
  input: AcceptAdminInviteInput,
  session?: SessionContext | null
): Promise<AcceptAdminInviteResult> {
  const activeSession: SessionContext = await resolveSessionContext(session)
  activeSession.$authorize()
  const userId = getAuthorizedUserId(activeSession)
  const { token } = AcceptAdminInviteSchema.parse(input)
  const hashedToken = hashToken(token)

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, roles: true },
      })
      if (!user) {
        throw new AcceptAdminInviteError("Account not found")
      }

      const invite = await tx.adminInvite.findUnique({
        where: { token: hashedToken },
        select: {
          id: true,
          email: true,
          expiresAt: true,
          redeemedAt: true,
          revokedAt: true,
          createdById: true,
        },
      })

      if (!invite) throw new AcceptAdminInviteError("Invalid invite token")
      if (invite.redeemedAt) {
        throw new AcceptAdminInviteError("This invite has already been redeemed")
      }
      if (invite.revokedAt) throw new AcceptAdminInviteError("This invite has been revoked")
      if (invite.expiresAt <= new Date())
        throw new AcceptAdminInviteError("This invite has expired")

      if (invite.email.trim().toLowerCase() !== user.email.toLowerCase()) {
        throw new AcceptAdminInviteError(
          "This invitation was sent to a different email address than your account's."
        )
      }

      const eligibility = getAdminInviteEligibility(user.roles)
      if (!eligibility.eligible) {
        throw new AcceptAdminInviteError(describeAdminInviteIneligibility(eligibility.reason))
      }

      // Single-use: only one concurrent accept can flip this row.
      const redeemed = await tx.adminInvite.updateMany({
        where: { id: invite.id, redeemedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { redeemedAt: new Date(), redeemedById: user.id },
      })
      if (redeemed.count !== 1) {
        throw new AcceptAdminInviteError("This invite is no longer available")
      }

      await tx.user.update({
        where: { id: user.id },
        data: { roles: { push: UserRole.ADMIN } },
      })

      await tx.adminAuditEvent.create({
        data: {
          actorUserId: user.id,
          actorRole: activeSession.role ?? undefined,
          event: "admin_invite_accepted",
          entityType: "AdminInvite",
          entityId: invite.id,
          metadata: {
            grantedRole: UserRole.ADMIN,
            previousRoles: user.roles,
            invitedById: invite.createdById,
          },
        },
      })
    })
  } catch (error) {
    if (error instanceof AcceptAdminInviteError) {
      return { ok: false, error: error.message }
    }
    throw error
  }

  // The researcher account normally has a JATOS user already; this only repairs a failed signup-time provision.
  try {
    await ensureResearcherProvisioned(userId)
  } catch (error) {
    console.warn("JATOS provisioning failed while accepting admin invite:", error)
  }

  // Start acting as admin right away; the researcher role stays available via the role switch.
  await activeSession.$setPublicData({ role: UserRole.ADMIN })

  return { ok: true, activeRole: UserRole.ADMIN }
}
