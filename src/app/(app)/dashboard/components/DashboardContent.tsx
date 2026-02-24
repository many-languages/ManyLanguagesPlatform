"use client"

import DashboardNotificationsCard from "./DashboardNotificationsCard"

type CurrentUser = {
  id: number
  firstname: string | null
  lastname: string | null
  username: string | null
  email: string
  role: string
  gravatar: string | null
  createdAt: Date
} | null

interface DashboardContentProps {
  currentUser: CurrentUser
}

export default function DashboardContent({ currentUser }: DashboardContentProps) {
  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">
        Welcome{" "}
        {currentUser?.firstname && currentUser?.lastname
          ? `${currentUser.firstname} ${currentUser.lastname}`
          : currentUser?.username || ""}
      </h1>

      <div className="max-w-2xl mx-auto mt-6">
        <DashboardNotificationsCard />
      </div>
    </main>
  )
}
