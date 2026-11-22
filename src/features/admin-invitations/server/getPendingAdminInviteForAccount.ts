import { cache } from "react"
import db from "db"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getAdminInviteEligibility } from "@/src/lib/auth/roles"

export type PendingAdminInviteSummary = { expiresAt: Date }

/**
 * A usable admin invitation addressed to this account's email, if the account could accept one
 * (a researcher who isn't an admin yet). Only a hint for the dashboard: it carries no token, and
 * accepting still requires the token from the invitation email, because signup does not verify
 * email ownership.
 */
export async function findPendingAdminInviteForUser(
  userId: number
): Promise<PendingAdminInviteSummary | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, roles: true },
  })
  if (!user) return null

  const eligibility = getAdminInviteEligibility(user.roles)
  if (!eligibility.eligible || eligibility.kind !== "existing-researcher") return null

  return db.adminInvite.findFirst({
    where: {
      // Invites created before emails were normalized may differ in case.
      email: { equals: user.email, mode: "insensitive" },
      redeemedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  })
}

/** For the researcher dashboard: only while acting as a researcher, where accepting makes sense. */
export const getPendingAdminInviteRsc = cache(async () => {
  const { session } = await getBlitzContext()
  if (!session.userId || session.role !== "RESEARCHER") return null

  return findPendingAdminInviteForUser(session.userId)
})
