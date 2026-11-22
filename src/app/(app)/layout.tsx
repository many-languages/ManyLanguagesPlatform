import { redirect } from "next/navigation"
import { Toaster } from "react-hot-toast"
import { getBlitzContext } from "../blitz-server"
import { NotificationMenuRootProvider } from "@/src/features/notifications"
import {
  getNotificationMenuDataForUser,
  notificationAudienceForRole,
} from "@/src/features/notifications/index.server"
import { AppNavbar } from "@/src/features/shell"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { DEFAULT_ADMIN_PATH } from "@/src/lib/auth/routing"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()

  // Signed out: go to login, remembering the requested URL so login can return there.
  if (!session.userId) {
    redirect(await getLoginUrl())
  }

  if (isStaffAdmin(session.role)) {
    redirect(DEFAULT_ADMIN_PATH)
  }

  const initialMenuData = await getNotificationMenuDataForUser(
    session.userId!,
    notificationAudienceForRole(session.role)
  )

  return (
    <NotificationMenuRootProvider initialData={initialMenuData}>
      <div className="min-h-screen flex flex-col">
        <AppNavbar variant="portal" />
        <main className="flex-1 mt-4 px-6 pb-12 sm:px-8 sm:pb-16 lg:px-12">
          {children}
          <Toaster position="top-right" />
        </main>
      </div>
    </NotificationMenuRootProvider>
  )
}
