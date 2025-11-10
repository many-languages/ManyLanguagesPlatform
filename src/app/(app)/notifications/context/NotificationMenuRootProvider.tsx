"use client"

import { NotificationMenuProvider } from "./NotificationMenuContext"

export const NotificationMenuRootProvider = ({ children }: { children: React.ReactNode }) => {
  return <NotificationMenuProvider>{children}</NotificationMenuProvider>
}
