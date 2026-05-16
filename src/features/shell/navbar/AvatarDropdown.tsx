"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { Route } from "next"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import md5 from "md5"

import logout from "@/src/features/auth/mutations/logout"
import type { CurrentUser, NavbarVariant } from "./types"

function getGravatarUrl(email: string, size: number = 40): string {
  const normalizedEmail = email.toLowerCase().trim()
  const hash = md5(normalizedEmail)
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro&r=pg`
}

interface AvatarDropdownProps {
  currentUser: CurrentUser
  variant: NavbarVariant
}

export function AvatarDropdown({ currentUser, variant }: AvatarDropdownProps) {
  const [logoutMutation] = useMutation(logout)
  const router = useRouter()

  const gravatarUrl = useMemo(() => {
    const email =
      currentUser?.gravatar && currentUser.gravatar.trim() !== ""
        ? currentUser.gravatar
        : currentUser?.email
    return email ? getGravatarUrl(email, 40) : ""
  }, [currentUser?.gravatar, currentUser?.email])

  const closeActiveDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  const profileHref = (variant === "admin" ? "/admin/profile" : "/profile") as Route

  return (
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
          <Link className="justify-between" href={profileHref} onClick={closeActiveDropdown}>
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
  )
}
