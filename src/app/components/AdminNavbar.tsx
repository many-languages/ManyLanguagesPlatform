"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import md5 from "md5"
import logout from "../(auth)/mutations/logout"
import ThemeToggle from "./ThemeToggle"

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

interface AdminNavbarProps {
  currentUser: CurrentUser
}

function getGravatarUrl(email: string, size: number = 40): string {
  const normalizedEmail = email.toLowerCase().trim()
  const hash = md5(normalizedEmail)
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro&r=pg`
}

export default function AdminNavbar({ currentUser }: AdminNavbarProps) {
  const gravatarUrl = useMemo(() => {
    const email =
      currentUser?.gravatar && currentUser.gravatar.trim() !== ""
        ? currentUser.gravatar
        : currentUser?.email
    return email ? getGravatarUrl(email, 40) : ""
  }, [currentUser?.gravatar, currentUser?.email])

  const [logoutMutation] = useMutation(logout)
  const router = useRouter()

  const closeActiveDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  return (
    <div className="navbar bg-base-100 sticky top-0 z-50 shadow-sm border-b border-primary/40 min-h-0 py-2">
      <div className="flex-1 gap-3 items-center">
        <Link className="btn btn-ghost text-xl" href="/admin" onClick={closeActiveDropdown}>
          Admin Console
        </Link>
        <span className="badge badge-primary badge-outline uppercase tracking-wide">Admin</span>
      </div>

      <div className="flex-none px-6 flex items-center gap-4">
        <ul className="menu menu-horizontal items-center gap-1">
          <li>
            <Link href={"/admin"} onClick={closeActiveDropdown}>
              Overview
            </Link>
          </li>
          <li>
            <Link href={"/studies"} onClick={closeActiveDropdown}>
              Studies
            </Link>
          </li>
          <li>
            <Link href={"/dashboard"} onClick={closeActiveDropdown}>
              Dashboard
            </Link>
          </li>
        </ul>

        <ThemeToggle />

        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
            <div className="w-10 rounded-full">
              {gravatarUrl ? (
                <img
                  src={gravatarUrl}
                  alt="Admin avatar"
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
