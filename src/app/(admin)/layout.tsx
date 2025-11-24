import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Toaster } from "react-hot-toast"
import { getBlitzContext } from "../blitz-server"
import { getCurrentUserRsc } from "../users/queries/getCurrentUser"
import AdminNavbar from "../components/AdminNavbar"
import NavbarSkeleton from "../components/NavbarSkeleton"

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await getBlitzContext()

  if (!session.userId) {
    redirect("/login")
  }

  if (session.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const currentUser = await getCurrentUserRsc().catch(() => null)

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <Suspense fallback={<NavbarSkeleton />}>
        <AdminNavbar currentUser={currentUser} />
      </Suspense>
      <main className="flex-1 mt-6 px-6 sm:px-8 lg:px-12">{children}</main>
      <Toaster position="top-right" />
    </div>
  )
}
