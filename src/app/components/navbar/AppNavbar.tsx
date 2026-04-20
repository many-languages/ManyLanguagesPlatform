"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import md5 from "md5"
import logout from "../../(auth)/mutations/logout"
import {
  NotificationMenu as NotificationsMenu,
  NotificationMenuProvider,
} from "@/src/features/notifications"
import ThemeToggle from "../ThemeToggle"
import { adminNavItems, portalNavItems } from "./navConfig"
import type { CurrentUser, NavbarVariant } from "./types"

function getGravatarUrl(email: string, size: number = 40): string {
  const normalizedEmail = email.toLowerCase().trim()
  const hash = md5(normalizedEmail)
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro&r=pg`
}

export interface AppNavbarProps {
  variant: NavbarVariant
  currentUser: CurrentUser
}

export default function AppNavbar({ variant, currentUser }: AppNavbarProps) {
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

  const items =
    variant === "admin"
      ? adminNavItems.filter((item) => !item.superAdminOnly || currentUser?.role === "SUPERADMIN")
      : portalNavItems

  const brandHref = variant === "admin" ? "/admin/dashboard" : "/dashboard"

  return (
    <div className="navbar bg-base-100 sticky top-0 z-50 shadow-sm border-b border-gray-300 min-h-0 py-2">
      <div className="flex-1">
        <Link className="btn btn-ghost text-xl" href={brandHref} onClick={closeActiveDropdown}>
          ManyLanguagesPlatform
        </Link>
      </div>

      <div className="flex-none px-6 flex items-center gap-2">
        <ul className="menu menu-horizontal px-6 items-center">
          {variant === "portal" && (
            <li>
              <NotificationMenuProvider>
                <NotificationsMenu />
              </NotificationMenuProvider>
            </li>
          )}
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={closeActiveDropdown}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <ThemeToggle />

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
              <Link className="justify-between" href="/profile" onClick={closeActiveDropdown}>
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
