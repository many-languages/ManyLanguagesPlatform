"use client"

import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Route } from "next"
import { useMutation } from "@blitzjs/rpc"
import md5 from "md5"

import logout from "@/src/features/auth/mutations/logout"
import switchActiveRole from "@/src/features/auth/mutations/switchActiveRole"
import { usePendingNavigation } from "@/src/lib/hooks/usePendingNavigation"
import { getDefaultAuthenticatedPath } from "@/src/lib/auth/routing"
import { getSwitchTargetRole } from "@/src/lib/auth/roles"
import type { CurrentUser, NavbarVariant } from "./types"

function getGravatarUrl(email: string, size: number = 40): string {
  const normalizedEmail = email.toLowerCase().trim()
  const hash = md5(normalizedEmail)
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro&r=pg`
}

interface AvatarDropdownProps {
  currentUser: CurrentUser
  variant: NavbarVariant
  /** The role this session is acting as (from the session, not everything the account holds). */
  activeRole: string | null
}

const SWITCH_LABEL = { ADMIN: "Switch to admin", RESEARCHER: "Switch to researcher" } as const

export function AvatarDropdown({ currentUser, variant, activeRole }: AvatarDropdownProps) {
  const [logoutMutation] = useMutation(logout)
  const [switchRoleMutation, { isPending: isSwitchingRole }] = useMutation(switchActiveRole)
  const { isPending: isNavigating, replace } = usePendingNavigation()
  const isSwitching = isSwitchingRole || isNavigating
  const switchTarget = getSwitchTargetRole(currentUser?.roles, activeRole)

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
            <Image
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
        {(switchTarget === "ADMIN" || switchTarget === "RESEARCHER") && (
          <li>
            <button
              disabled={isSwitching}
              aria-busy={isSwitching}
              onClick={async () => {
                const { activeRole: nextRole } = await switchRoleMutation({ role: switchTarget })
                // Soft navigation: the admin and portal areas have separate layouts, so the new
                // role's navbar and notifications render fresh, without reloading the whole app
                // (a full reload showed a blank screen and two loading states in a row).
                // `replace` keeps the other role's page out of the Back history.
                replace(getDefaultAuthenticatedPath(nextRole))
              }}
            >
              {isSwitching ? "Switching…" : SWITCH_LABEL[switchTarget]}
            </button>
          </li>
        )}
        <li>
          <button
            onClick={async () => {
              await logoutMutation()
              // Hard navigation drops the Next.js router cache and client state so the back
              // button cannot show authenticated pages after logout.
              window.location.assign("/login")
            }}
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  )
}
