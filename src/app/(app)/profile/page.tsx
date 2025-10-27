"use client"

import { useCurrentUser } from "../../users/hooks/useCurrentUser"
import Link from "next/link"
import Card from "../../components/Card"
import Loading from "../../loading"

export default function ProfilePage() {
  // Get current user data
  const currentUser = useCurrentUser()

  if (!currentUser) {
    return <Loading />
  }

  // Construct name
  const fullname =
    currentUser.firstname && currentUser.lastname
      ? `${currentUser.firstname} ${currentUser.lastname}`
      : null

  return (
    <main>
      <h1 className="text-3xl flex justify-center mb-2">My profile</h1>
      <Card
        title={"Profile information"}
        actions={
          <>
            <Link className="btn btn-primary" href="/profile/edit">
              Edit Profile
            </Link>

            <Link className="btn btn-secondary" href="/reset-password">
              Change Password
            </Link>
          </>
        }
      >
        <span className="font-semibold">Username:</span>{" "}
        {currentUser.username ? currentUser.username : "No username is provided."}
        <br />
        <span className="font-semibold">Email:</span> {currentUser.email}
        <br />
        <span className="font-semibold">Name:</span>{" "}
        {fullname ? (
          fullname
        ) : (
          <span className="italic">
            No name is provided. Use the Edit Profile button to add your name.
          </span>
        )}
        <br />
        <span className="font-semibold">Signup Date:</span>{" "}
        {new Date(currentUser.createdAt).toLocaleDateString()}
      </Card>
    </main>
  )
}
