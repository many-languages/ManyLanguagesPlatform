import MainNavbar from "../components/MainNavbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <MainNavbar />
      <main className="flex-1">{children}</main>
    </div>
  )
}
