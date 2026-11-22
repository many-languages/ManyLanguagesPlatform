import { redirect } from "next/navigation"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"
import { ProfileContent, type ProfilePaths } from "@/src/features/profile"

const adminProfilePaths: ProfilePaths = {
  root: "/admin/profile",
  edit: "/admin/profile/edit",
}

export default async function AdminProfilePage() {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect(await getLoginUrl())
  }

  const currentUser = await getCurrentUserRsc()

  if (!currentUser) {
    redirect(await getLoginUrl())
  }

  return (
    <main>
      <ProfileContent currentUser={currentUser} profilePaths={adminProfilePaths} />
    </main>
  )
}
