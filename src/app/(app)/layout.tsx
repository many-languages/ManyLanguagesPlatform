import MainNavbar from "../components/MainNavbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavbar />
      <main className="flex-1 mt-4 px-6 sm:px-8 lg:px-12">{children}</main>
    </div>
  )
}
