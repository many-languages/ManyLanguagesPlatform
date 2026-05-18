import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import { AvatarDropdown } from "./AvatarDropdown"
import type { NavbarVariant } from "./types"

interface AvatarSectionProps {
  variant: NavbarVariant
}

export async function AvatarSection({ variant }: AvatarSectionProps) {
  const currentUser = await getCurrentUserRsc().catch(() => null)
  return <AvatarDropdown currentUser={currentUser} variant={variant} />
}
