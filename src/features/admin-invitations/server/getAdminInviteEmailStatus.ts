import db from "db"
import { describeAdminInviteIneligibility, getAdminInviteEligibility } from "@/src/lib/auth/roles"

export type AdminInviteEmailStatus =
  | { eligible: true; kind: "new-account" | "existing-researcher"; message: string }
  | { eligible: false; reason: "participant" | "already-admin"; message: string }

/**
 * What would happen if `rawEmail` were invited as an admin. Caller must already be authorized
 * (superadmin): the answer reveals whether an email is registered and with which role.
 */
export async function getAdminInviteEmailStatus(rawEmail: string): Promise<AdminInviteEmailStatus> {
  const email = rawEmail.trim().toLowerCase()
  const existingUser = await db.user.findUnique({ where: { email }, select: { roles: true } })

  const eligibility = getAdminInviteEligibility(existingUser?.roles)
  if (!eligibility.eligible) {
    return {
      eligible: false,
      reason: eligibility.reason,
      message: describeAdminInviteIneligibility(eligibility.reason),
    }
  }

  return {
    eligible: true,
    kind: eligibility.kind,
    message:
      eligibility.kind === "existing-researcher"
        ? "This email already has a researcher account. The invitee will log in to accept, keeping their researcher account and gaining an admin role they can switch to."
        : "No account uses this email yet. The invitee will sign up as a new admin.",
  }
}
