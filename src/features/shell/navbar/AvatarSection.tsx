import { getBlitzContext } from "@/src/app/blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import { AvatarDropdown } from "./AvatarDropdown"
import type { NavbarVariant } from "./types"

interface AvatarSectionProps {
  variant: NavbarVariant
}

export async function AvatarSection({ variant }: AvatarSectionProps) {
  const [currentUser, { session }] = await Promise.all([
    getCurrentUserRsc().catch(() => null),
    getBlitzContext(),
  ])
  // Roles the account holds come from the database; the one in use right now from the session.
  return (
    <AvatarDropdown currentUser={currentUser} variant={variant} activeRole={session.role ?? null} />
  )
}
