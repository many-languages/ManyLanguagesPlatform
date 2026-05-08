import type { CurrentUserFromSession } from "@/src/features/auth/queries/getCurrentUser"

/** Props for profile UI — same shape as `getCurrentUserRsc` / `getCurrentUser` (Prisma-inferred). */
export type ProfileContentUser = CurrentUserFromSession

/** Passed from thin route pages so portal vs admin URLs stay explicit (see profile-feature-migration.md). */
export type ProfilePaths = {
  root: string
  edit: string
}
