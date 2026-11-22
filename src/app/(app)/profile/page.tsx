import { redirect } from "next/navigation"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import { getBlitzContext } from "../../blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import { ProfileContent, type ProfilePaths } from "@/src/features/profile"

const portalProfilePaths: ProfilePaths = {
  root: "/profile",
  edit: "/profile/edit",
}

export default async function ProfilePage() {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect(await getLoginUrl())
  }

  // Fetch user data server-side (will be cached if already fetched in layout)
  const currentUser = await getCurrentUserRsc()

  if (!currentUser) {
    redirect(await getLoginUrl())
  }

  return (
    <main>
      <ProfileContent currentUser={currentUser} profilePaths={portalProfilePaths} />
    </main>
  )
}
