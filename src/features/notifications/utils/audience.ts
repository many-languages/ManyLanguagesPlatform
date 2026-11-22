import type { NotificationAudience } from "@prisma/client"
import { isStaffAdmin } from "@/src/lib/auth/roles"

/**
 * Which inbox a user sees depends on the role they are acting as, not on every role they hold:
 * a researcher who is also an admin has separate portal and admin inboxes, so a notification never
 * links into an area their current role cannot open.
 */
export function notificationAudienceForRole(role: string | null | undefined): NotificationAudience {
  return isStaffAdmin(role) ? "ADMIN" : "PORTAL"
}
