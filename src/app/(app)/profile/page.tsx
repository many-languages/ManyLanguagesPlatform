import { redirect } from "next/navigation"
import { getBlitzContext } from "../../blitz-server"
import { getCurrentUserRsc } from "../../users/queries/getCurrentUser"
import ProfileContent from "./components/ProfileContent"

export default async function ProfilePage() {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect("/login")
  }

  // Fetch user data server-side (will be cached if already fetched in layout)
  const currentUser = await getCurrentUserRsc()

  if (!currentUser) {
    redirect("/login")
  }

  return (
    <main>
      <ProfileContent currentUser={currentUser} />
    </main>
  )
}
