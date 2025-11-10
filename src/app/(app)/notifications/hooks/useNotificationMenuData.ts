"use client"

import { useMemo } from "react"
import { useQuery } from "@blitzjs/rpc"

import getUnreadNotificationCount from "../queries/getUnreadNotificationCount"
import getLatestUnreadNotifications from "../queries/getLatestUnreadNotifications"
import { RouteData } from "../types"
import { parseRouteData } from "../utils/parseRouteData"

export type MenuNotification = {
  id: number
  message: string
  routeData: RouteData | null
}

export const useNotificationMenuData = () => {
  const [unreadCount = 0] = useQuery(getUnreadNotificationCount, {})
  const [latestUnread = []] = useQuery(getLatestUnreadNotifications, {})

  const latestUnreadNotifications = useMemo<MenuNotification[]>(() => {
    return latestUnread.map((recipient) => {
      const routeData: RouteData | null = parseRouteData(recipient.notification.routeData)

      return {
        id: recipient.notificationId,
        message: recipient.notification.message,
        routeData,
      }
    })
  }, [latestUnread])

  return {
    unreadCount,
    latestUnreadNotifications,
  }
}
