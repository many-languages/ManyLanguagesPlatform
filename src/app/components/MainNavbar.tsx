"use client"

import Link from "next/link"
import React, { useMemo } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import logout from "../(auth)/mutations/logout"
import NotificationsMenu from "../(app)/notifications/components/clients/NotificationMenu"
import { NotificationMenuProvider } from "../(app)/notifications/context/NotificationMenuContext"
import ThemeToggle from "./ThemeToggle"

// User type from getCurrentUser query
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

interface MainNavbarProps {
  currentUser: CurrentUser
}

// Helper function to generate Gravatar URL
function getGravatarUrl(email: string, size: number = 40): string {
  // Simple MD5-like hash (for production, consider using crypto.subtle or a library)
  // For now, using Gravatar's default URL format
  const hash = email.toLowerCase().trim()
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro&r=pg`
}

// MainNavbar
// Always present on the top of the page
// Includes non-project specific functionalities
// Receives user data from layout (server-side) to preserve state across navigation
const MainNavbar = ({ currentUser }: MainNavbarProps) => {
  // Memoize gravatar URL to prevent unnecessary recalculations
  const gravatarUrl = useMemo(() => {
    const email =
      currentUser?.gravatar && currentUser.gravatar.trim() !== ""
        ? currentUser.gravatar
        : currentUser?.email
    return email ? getGravatarUrl(email, 40) : ""
  }, [currentUser?.gravatar, currentUser?.email])

  // Logout
  const [logoutMutation] = useMutation(logout)
  const router = useRouter()

  const closeActiveDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  return (
    <div className="navbar bg-base-100 sticky top-0 z-50 shadow-sm border-b border-gray-300 min-h-0 py-2">
      {/* Title */}
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">ManyLanguagesPlatform</a>
      </div>

      {/* Navigation */}
      <div className="flex-none px-6 flex items-center gap-2">
        {/* Tabs */}
        <ul className="menu menu-horizontal px-6 items-center">
          <li>
            <NotificationMenuProvider>
              <NotificationsMenu />
            </NotificationMenuProvider>
          </li>
          <li>
            <Link href={"/dashboard"} onClick={closeActiveDropdown}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link href={"/studies"} onClick={closeActiveDropdown}>
              My studies
            </Link>
          </li>
          <li>
            <Link href={"/explore"} onClick={closeActiveDropdown}>
              Explore
            </Link>
          </li>
        </ul>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile tab */}
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
            <div className="w-10 rounded-full">
              {gravatarUrl ? (
                <img
                  src={gravatarUrl}
                  alt="User avatar"
                  className="rounded-full"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-base-300" />
              )}
            </div>
          </label>
          <ul className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-300 rounded-box w-52">
            <li>
              <Link
                className="justify-between"
                key="Profile"
                href="/profile"
                onClick={closeActiveDropdown}
              >
                Profile
              </Link>
            </li>
            <li>
              <button
                onClick={async () => {
                  await logoutMutation()
                  await router.push("/")
                  closeActiveDropdown()
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

export default MainNavbar
