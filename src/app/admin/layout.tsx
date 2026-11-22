import { redirect } from "next/navigation"
import { Toaster } from "react-hot-toast"
import { getLoginUrl } from "@/src/lib/auth/getLoginUrl"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { NotificationMenuRootProvider } from "@/src/features/notifications"
import {
  getNotificationMenuDataForUser,
  notificationAudienceForRole,
} from "@/src/features/notifications/index.server"
import { AppNavbar } from "@/src/features/shell"
import { getBlitzContext } from "../blitz-server"

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect(await getLoginUrl())
  }

  if (!isStaffAdmin(session.role)) {
    redirect("/dashboard")
  }

  const initialMenuData = await getNotificationMenuDataForUser(
    session.userId,
    notificationAudienceForRole(session.role)
  )

  return (
    <NotificationMenuRootProvider initialData={initialMenuData}>
      <div className="min-h-screen flex flex-col bg-base-200">
        <AppNavbar variant="admin" userRole={session.role ?? undefined} />
        <main className="flex-1 mt-6 px-6 sm:px-8 lg:px-12">{children}</main>
        <Toaster position="top-right" />
      </div>
    </NotificationMenuRootProvider>
  )
}
