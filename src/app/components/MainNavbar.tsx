"use client"
import Link from "next/link"
import React from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "../users/hooks/useCurrentUser"
import Gravatar from "react-gravatar"
import logout from "../(auth)/mutations/logout"

// MainNavbar
// Always present on the top of the page
// Includes non-project specific functionalities
const Navbar = () => {
  // Get current user data
  const currentUser = useCurrentUser()

  const gravatar_email =
    currentUser?.gravatar && currentUser.gravatar.trim() !== ""
      ? currentUser.gravatar
      : currentUser?.email // Fallback to last known valid email

  // Logout
  const [logoutMutation] = useMutation(logout)
  const router = useRouter()

  // return pages
  return (
    <div className="navbar bg-base-100 sticky shadow-sm border-b border-gray-300">
      {/* Title */}
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">ManyLanguagesPlatform</a>
      </div>

      {/* Navigation */}
      <div className="flex-none px-6">
        {/* Tabs */}
        <ul className="menu menu-horizontal px-6">
          {/* Dashboard tab */}
          <li>
            <Link href={"/dashboard"}>Dashboard</Link>
          </li>
          <li>
            <Link href={"/studies"}>My studies</Link>
          </li>
          <li>
            <Link href={"/explore"}>Explore</Link>
          </li>
        </ul>

        {/* Profile tab */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
            <div className="w-10 rounded-full">
              <Gravatar email={gravatar_email} style={{ borderRadius: "50%" }} default="retro" />
            </div>
          </label>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-300 rounded-box w-52"
          >
            <li>
              <Link className="justify-between text-red-500" key="Profile" href="/profile">
                Profile
              </Link>
            </li>
            <li>
              <button
                onClick={async () => {
                  await logoutMutation()
                  await router.push("/")
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const MainNavbar = () => {
  return <Navbar />
}

export default MainNavbar
