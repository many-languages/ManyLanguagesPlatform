import { redirect } from "next/navigation"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/queries/getCurrentUser"
import { ProfileContent, type ProfilePaths } from "@/src/features/profile"

const adminProfilePaths: ProfilePaths = {
  root: "/admin/profile",
  edit: "/admin/profile/edit",
}

export default async function AdminProfilePage() {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect("/login")
  }

  const currentUser = await getCurrentUserRsc()

  if (!currentUser) {
    redirect("/login")
  }

  return (
    <main>
      <ProfileContent currentUser={currentUser} profilePaths={adminProfilePaths} />
    </main>
  )
}
