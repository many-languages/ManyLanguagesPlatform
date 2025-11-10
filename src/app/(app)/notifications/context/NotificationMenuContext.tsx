"use client"

import { createContext, useContext, useMemo } from "react"
import { useQuery } from "@blitzjs/rpc"

import getUnreadNotificationCount from "../queries/getUnreadNotificationCount"
import getLatestUnreadNotifications from "../queries/getLatestUnreadNotifications"
import { parseRouteData } from "../utils/parseRouteData"
import type { RouteData } from "../types"

type NotificationMenuEntry = {
  id: number
  message: string
  routeData: RouteData | null
}

type NotificationMenuContextValue = {
  unreadCount: number
  latestNotifications: NotificationMenuEntry[]
  refetch: () => Promise<void>
}

const NotificationMenuContext = createContext<NotificationMenuContextValue | null>(null)

export const NotificationMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount = 0, { refetch: refetchUnread }] = useQuery(getUnreadNotificationCount, {})
  const [latestUnread = [], { refetch: refetchLatest }] = useQuery(getLatestUnreadNotifications, {})

  const value = useMemo<NotificationMenuContextValue>(
    () => ({
      unreadCount,
      latestNotifications: latestUnread.map((recipient) => ({
        id: recipient.notificationId,
        message: recipient.notification.message,
        routeData: parseRouteData(recipient.notification.routeData),
      })),
      refetch: async () => {
        await Promise.all([refetchUnread(), refetchLatest()])
      },
    }),
    [unreadCount, latestUnread, refetchUnread, refetchLatest]
  )

  return (
    <NotificationMenuContext.Provider value={value}>{children}</NotificationMenuContext.Provider>
  )
}

export const useNotificationMenuContext = () => {
  const context = useContext(NotificationMenuContext)
  if (!context) {
    throw new Error("useNotificationMenuContext must be used within NotificationMenuProvider")
  }
  return context
}
