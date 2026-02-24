"use client"

import Link from "next/link"
import { useNotificationMenuContext } from "../../notifications/context/NotificationMenuContext"
import NotificationItem from "../../notifications/components/clients/NotificationItem"
import Card from "@/src/app/components/Card"

export default function DashboardNotificationsCard() {
  const { unreadCount, latestNotifications } = useNotificationMenuContext()

  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2">
          <span>Recent notifications</span>
          <span className="badge badge-primary badge-lg">{unreadCount}</span>
        </span>
      }
      actions={
        <Link href="/notifications" className="btn btn-primary">
          View all notifications
        </Link>
      }
      bgColor="bg-base-300"
    >
      {latestNotifications.length > 0 ? (
        <div className="space-y-2">
          {latestNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      ) : (
        <p className="text-base-content/70">No new notifications.</p>
      )}
    </Card>
  )
}
