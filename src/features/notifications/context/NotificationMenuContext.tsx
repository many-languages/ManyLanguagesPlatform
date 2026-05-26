"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@blitzjs/rpc"

import getNotificationMenuData from "../queries/getNotificationMenuData"
import { parseRouteData } from "../utils/parseRouteData"
import type { RouteData } from "../types"
import type { NotificationMenuData } from "../server/getNotificationMenuData"

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

function toMenuEntries(data: NotificationMenuData): NotificationMenuEntry[] {
  return (data.latestUnread ?? []).map((recipient) => ({
    id: recipient.notificationId,
    message: recipient.notification.message,
    routeData: parseRouteData(recipient.notification.routeData),
  }))
}

export const NotificationMenuProvider = ({
  children,
  initialData,
}: {
  children: React.ReactNode
  initialData: NotificationMenuData
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const [menuData, setMenuData] = useState(initialData)
  const [, { refetch: refetchQuery }] = useQuery(getNotificationMenuData, {}, { enabled: false })

  useEffect(() => {
    setMenuData(initialData)
  }, [initialData])

  const refreshMenu = useCallback(async () => {
    const result = await refetchQuery()
    if (result.data) {
      setMenuData(result.data)
    }
  }, [refetchQuery])

  const previousPathnameRef = useRef(pathname)
  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return
    }
    previousPathnameRef.current = pathname
    void refreshMenu()
  }, [pathname, refreshMenu])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshMenu()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [refreshMenu])

  const value = useMemo<NotificationMenuContextValue>(
    () => ({
      unreadCount: menuData.unreadCount,
      latestNotifications: toMenuEntries(menuData),
      refetch: async () => {
        await refreshMenu()
        router.refresh()
      },
    }),
    [menuData, refreshMenu, router]
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
