import type { UserRole } from "db"
import { isStaffAdmin } from "./roles"

export const DEFAULT_PORTAL_PATH = "/dashboard"
export const DEFAULT_ADMIN_PATH = "/admin/dashboard"

/** Where to send a user immediately after login / when redirecting authenticated users away from auth routes. */
export function getDefaultAuthenticatedPath(role: UserRole | string | null | undefined): string {
  if (isStaffAdmin(role)) {
    return DEFAULT_ADMIN_PATH
  }
  return DEFAULT_PORTAL_PATH
}
