import { redirect } from "next/navigation"
import Card from "@/src/components/ui/Card"
import { EditProfileForm, type ProfilePaths } from "@/src/features/profile"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"

const adminProfilePaths: ProfilePaths = {
  root: "/admin/profile",
  edit: "/admin/profile/edit",
}

export default async function AdminEditProfilePage() {
  const { session } = await getBlitzContext()
  if (!session.userId) {
    redirect("/login")
  }

  const currentUser = await getCurrentUserRsc()
  if (!currentUser) {
    redirect("/login")
  }

  const initialValues = {
    firstname: currentUser.firstname ?? "",
    lastname: currentUser.lastname ?? "",
    username: currentUser.username ?? "",
  }

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">Edit Profile</h1>
      <Card title={"Personal information"}>
        <EditProfileForm profilePaths={adminProfilePaths} initialValues={initialValues} />
      </Card>
    </main>
  )
}
