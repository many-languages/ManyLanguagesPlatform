import { redirect } from "next/navigation"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import Card from "@/src/components/ui/Card"
import { EditProfileForm, type ProfilePaths } from "@/src/features/profile"
import { getBlitzContext } from "@/src/app/blitz-server"
import { getCurrentUserRsc } from "@/src/features/auth/server/getCurrentUser"

const portalProfilePaths: ProfilePaths = {
  root: "/profile",
  edit: "/profile/edit",
}

export default async function EditProfilePage() {
  const { session } = await getBlitzContext()
  if (!session.userId) {
    redirect(await getLoginUrl())
  }

  const currentUser = await getCurrentUserRsc()
  if (!currentUser) {
    redirect(await getLoginUrl())
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
        <EditProfileForm profilePaths={portalProfilePaths} initialValues={initialValues} />
      </Card>
    </main>
  )
}
