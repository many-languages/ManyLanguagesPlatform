"use client"

import { createContext, useContext, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@blitzjs/rpc"

import getNotificationMenuData from "../queries/getNotificationMenuData"
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
  const router = useRouter()
  const [data, { refetch }] = useQuery(getNotificationMenuData, {})

  const value = useMemo<NotificationMenuContextValue>(
    () => ({
      unreadCount: data?.unreadCount ?? 0,
      latestNotifications: (data?.latestUnread ?? []).map((recipient) => ({
        id: recipient.notificationId,
        message: recipient.notification.message,
        routeData: parseRouteData(recipient.notification.routeData),
      })),
      refetch: async () => {
        await refetch()
        router.refresh()
      },
    }),
    [data, refetch, router]
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
