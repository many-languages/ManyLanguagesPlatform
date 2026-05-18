import { redirect } from "next/navigation"
import { Toaster } from "react-hot-toast"
import { getBlitzContext } from "../blitz-server"
import { NotificationMenuRootProvider } from "@/src/features/notifications"
import { AppNavbar } from "@/src/features/shell"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { DEFAULT_ADMIN_PATH } from "@/src/lib/auth/routing"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()
  if (isStaffAdmin(session.role)) {
    redirect(DEFAULT_ADMIN_PATH)
  }

  return (
    <NotificationMenuRootProvider>
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
