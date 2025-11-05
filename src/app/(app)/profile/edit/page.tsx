import Card from "@/src/app/components/Card"
import { EditProfileForm } from "../components/client/EditProfileForm"

export default function EditProfilePage() {
  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">Edit Profile</h1>
      <Card title={"Personal information"}>
        <EditProfileForm />
      </Card>
    </main>
  )
}
