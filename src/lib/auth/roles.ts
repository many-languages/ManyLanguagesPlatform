import type { UserRole } from "@/db"

export function isStaffAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPERADMIN"
}

export function isSuperAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "SUPERADMIN"
}
