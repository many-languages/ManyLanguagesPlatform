"use client"

import { BellIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import NotificationItem from "./NotificationItem"
import { useNotificationMenuContext } from "../context/NotificationMenuContext"

export type NotificationMenuVariant = "portal" | "admin"

interface NotificationsMenuProps {
  variant: NotificationMenuVariant
}

const VIEW_ALL_HREF: Record<NotificationMenuVariant, string> = {
  portal: "/notifications",
  admin: "/admin/notifications",
}

const NotificationsMenu = ({ variant }: NotificationsMenuProps) => {
  const { unreadCount, latestNotifications } = useNotificationMenuContext()

  const closeDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  return (
    <div className="dropdown dropdown-end hover:bg-transparent">
      <label tabIndex={0} className="btn btn-ghost btn-circle">
        <div className="indicator">
          <BellIcon className="w-5 h-5" data-tooltip-id="notifications-top-tooltip" />
          <span className="badge badge-sm indicator-item">{unreadCount}</span>
        </div>
      </label>

      <div
        tabIndex={0}
        className="mt-3 z-[1] card card-compact dropdown-content w-52 bg-base-300 shadow"
      >
        <div className="card-body">
          <span className="font-bold text-lg">{unreadCount} Notifications</span>

          {latestNotifications.length > 0 ? (
            latestNotifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <span className="text-info">No new notifications.</span>
          )}

          <div className="card-actions">
            <Link
              className="btn btn-primary btn-block"
              href={{ pathname: VIEW_ALL_HREF[variant] }}
              onClick={closeDropdown}
            >
              View All Notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsMenu
