"use client"
import { useCurrentUser } from "../../users/hooks/useCurrentUser"

export default function DashboardPage() {
  // Get current user data
  const currentUser = useCurrentUser()

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">
        Welcome{" "}
        {currentUser?.firstname && currentUser?.lastname
          ? `${currentUser.firstname} ${currentUser.lastname}`
          : currentUser?.username || ""}
      </h1>
    </main>
  )
}
