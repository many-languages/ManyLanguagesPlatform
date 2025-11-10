import { Suspense } from "react"
import { Toaster } from "react-hot-toast"
import { getBlitzContext } from "../blitz-server"
import { getCurrentUserRsc } from "../users/queries/getCurrentUser"
import MainNavbar from "../components/MainNavbar"
import NavbarSkeleton from "../components/NavbarSkeleton"
import { NotificationMenuRootProvider } from "./notifications/context/NotificationMenuRootProvider"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()
  const currentUser = session.userId ? await getCurrentUserRsc().catch(() => null) : null

  return (
    <NotificationMenuRootProvider>
      <div className="min-h-screen flex flex-col">
        <Suspense fallback={<NavbarSkeleton />}>
          <MainNavbar currentUser={currentUser} />
        </Suspense>
        <main className="flex-1 mt-4 px-6 sm:px-8 lg:px-12">
          {children}
          <Toaster position="top-right" />
        </main>
      </div>
    </NotificationMenuRootProvider>
  )
}
