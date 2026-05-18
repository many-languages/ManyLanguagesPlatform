import { Suspense } from "react"
import Link from "next/link"
import type { Route } from "next"

import {
  NotificationMenu as NotificationsMenu,
  NotificationMenuProvider,
} from "@/src/features/notifications"
import ThemeToggle from "../ui/ThemeToggle"
import { AvatarSection } from "./AvatarSection"
import { AvatarSkeleton } from "./AvatarSkeleton"
import { adminNavItems, portalNavItems } from "./navConfig"
import type { NavbarVariant } from "./types"

export interface AppNavbarProps {
  variant: NavbarVariant
  /**
   * Used only for the admin variant to filter superadmin-only nav items.
   * Provided from session.role in the layout so filtering works before
   * getCurrentUserRsc resolves.
   */
  userRole?: string
}

export default function AppNavbar({ variant, userRole }: AppNavbarProps) {
  const items =
    variant === "admin"
      ? adminNavItems.filter((item) => !item.superAdminOnly || userRole === "SUPERADMIN")
      : portalNavItems

  const brandHref = variant === "admin" ? "/admin/dashboard" : "/dashboard"

  return (
    <div className="navbar bg-base-100 sticky top-0 z-50 shadow-sm border-b border-gray-300 min-h-0 py-2">
      <div className="flex-1">
        <Link className="btn btn-ghost text-xl" href={brandHref as Route}>
          ManyLanguagesPlatform
        </Link>
      </div>

      <div className="flex-none px-6 flex items-center gap-2">
        <ul className="menu menu-horizontal px-6 items-center">
          <li>
            <NotificationMenuProvider>
              <NotificationsMenu variant={variant} />
            </NotificationMenuProvider>
          </li>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href as Route}>{item.label}</Link>
            </li>
          ))}
        </ul>

        <ThemeToggle />

        <Suspense fallback={<AvatarSkeleton />}>
          <AvatarSection variant={variant} />
        </Suspense>
      </div>
    </div>
  )
}
