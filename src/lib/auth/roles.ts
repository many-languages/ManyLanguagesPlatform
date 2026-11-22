import type { UserRole } from "@/db"

/**
 * Role model
 * ----------
 * `User.roles` lists everything an account may act as. The role it is acting as *right now* lives
 * only in the session (`session.role`) and is what every authorization guard reads. A user holding
 * several roles switches between them with the `switchActiveRole` mutation.
 *
 * Never filter users with a bare `role` — use the helpers below so accounts that hold a role as
 * one of several are not missed.
 */

export function isStaffAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPERADMIN"
}

export function isSuperAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "SUPERADMIN"
}

type RoleList = readonly (UserRole | string)[] | null | undefined

export function hasRole(roles: RoleList, role: UserRole): boolean {
  return !!roles?.includes(role)
}

/** True when the account holds at least one staff admin role (ADMIN or SUPERADMIN). */
export function hasStaffAdminRole(roles: RoleList): boolean {
  return hasRole(roles, "ADMIN") || hasRole(roles, "SUPERADMIN")
}

/** Prisma `where` fragment matching every user that holds at least one of `roles`. */
export function userHasAnyRoleWhere(roles: UserRole[]): { roles: { hasSome: UserRole[] } } {
  return { roles: { hasSome: roles } }
}

/** Prisma `where` fragment matching every staff admin, including ones currently acting as a researcher. */
export function staffAdminUsersWhere() {
  return userHasAnyRoleWhere(["ADMIN", "SUPERADMIN"])
}

// Highest privilege first. A user who holds several roles starts a new session as the first match.
const INITIAL_ROLE_PRIORITY: readonly UserRole[] = [
  "SUPERADMIN",
  "ADMIN",
  "RESEARCHER",
  "PARTICIPANT",
]

/** The role a fresh login (or signup, or password reset) starts acting as. */
export function pickInitialRole(roles: RoleList): UserRole {
  const role = INITIAL_ROLE_PRIORITY.find((candidate) => hasRole(roles, candidate))
  if (!role) {
    throw new Error("User has no roles")
  }
  return role
}

/** A role the user may switch to: they hold it, and it is not the one they are already using. */
export function canSwitchToRole(
  roles: RoleList,
  activeRole: UserRole | string | null | undefined,
  target: UserRole
): boolean {
  return hasRole(roles, target) && activeRole !== target
}

/** The role to offer in the "switch" menu entry, or null when the user holds a single role. */
export function getSwitchTargetRole(
  roles: RoleList,
  activeRole: UserRole | string | null | undefined
): UserRole | null {
  if (isStaffAdmin(activeRole)) {
    return canSwitchToRole(roles, activeRole, "RESEARCHER") ? "RESEARCHER" : null
  }
  if (activeRole === "RESEARCHER") {
    return hasRole(roles, "ADMIN") ? "ADMIN" : null
  }
  return null
}

export type AdminInviteEligibility =
  | { eligible: true; kind: "new-account" | "existing-researcher" }
  | { eligible: false; reason: "participant" | "already-admin" }

/**
 * Whether an email can accept an admin invitation, given the roles of the account that already
 * uses it (`null` when there is no such account yet).
 *
 * - no account: signs up as a new admin
 * - researcher: gains the ADMIN role in addition to RESEARCHER
 * - participant: never promotable (their participation data must not sit on a staff account)
 * - already admin / superadmin: nothing to grant
 */
export function getAdminInviteEligibility(existingRoles: RoleList): AdminInviteEligibility {
  if (!existingRoles || existingRoles.length === 0) {
    return { eligible: true, kind: "new-account" }
  }
  if (hasStaffAdminRole(existingRoles)) {
    return { eligible: false, reason: "already-admin" }
  }
  if (hasRole(existingRoles, "PARTICIPANT")) {
    return { eligible: false, reason: "participant" }
  }
  return { eligible: true, kind: "existing-researcher" }
}

/** Explains why an invite cannot be sent to / accepted by an email. Shown to superadmins and invitees. */
export function describeAdminInviteIneligibility(reason: "participant" | "already-admin"): string {
  if (reason === "participant") {
    return (
      "This email belongs to a participant account, and participants cannot be promoted to admin. " +
      "Invite a different address instead. Some providers (e.g. Gmail) deliver name+admin@example.com " +
      "to the same inbox as name@example.com, but treat it as a separate account."
    )
  }
  return "This email already belongs to an admin account."
}
