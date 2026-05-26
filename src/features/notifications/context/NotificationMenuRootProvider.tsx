"use client"

import { NotificationMenuProvider } from "./NotificationMenuContext"
import type { NotificationMenuData } from "../server/getNotificationMenuData"

type NotificationMenuRootProviderProps = {
  children: React.ReactNode
  initialData: NotificationMenuData
}

export const NotificationMenuRootProvider = ({
  children,
  initialData,
}: NotificationMenuRootProviderProps) => {
  return <NotificationMenuProvider initialData={initialData}>{children}</NotificationMenuProvider>
}
