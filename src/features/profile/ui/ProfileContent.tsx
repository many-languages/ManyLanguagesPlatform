"use client"

import Card from "@/src/components/ui/Card"
import Link from "next/link"
import type { Route } from "next"
import type { ProfileContentUser, ProfilePaths } from "../types"

interface ProfileContentProps {
  currentUser: ProfileContentUser
  profilePaths: ProfilePaths
}

export default function ProfileContent({ currentUser, profilePaths }: ProfileContentProps) {
  // Construct name
  const fullname =
    currentUser.firstname && currentUser.lastname
      ? `${currentUser.firstname} ${currentUser.lastname}`
      : null

  return (
    <>
      <h1 className="text-3xl flex justify-center mb-2">My profile</h1>
      <Card
        title={"Profile information"}
        actions={
          <>
            <Link className="btn btn-primary" href={profilePaths.edit as Route}>
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
    </>
  )
}
