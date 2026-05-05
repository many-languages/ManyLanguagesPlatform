import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Toaster } from "react-hot-toast"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { getCurrentUserRsc } from "@/src/features/auth/queries/getCurrentUser"
import { NotificationMenuRootProvider } from "@/src/features/notifications"
import { AppNavbar, NavbarSkeleton } from "@/src/features/shell"
import { getBlitzContext } from "../blitz-server"

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect("/login")
  }

  if (!isStaffAdmin(session.role)) {
    redirect("/dashboard")
  }

  const currentUser = await getCurrentUserRsc().catch(() => null)

  return (
    <NotificationMenuRootProvider>
      <div className="min-h-screen flex flex-col bg-base-200">
        <Suspense fallback={<NavbarSkeleton />}>
          <AppNavbar variant="admin" currentUser={currentUser} />
        </Suspense>
        <main className="flex-1 mt-6 px-6 sm:px-8 lg:px-12">{children}</main>
        <Toaster position="top-right" />
      </div>
    </NotificationMenuRootProvider>
  )
}
