import { useAuthenticatedBlitzContext } from "../blitz-server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await useAuthenticatedBlitzContext({
    redirectAuthenticatedTo: "/dashboard",
  })
  return (
    <main className="min-h-screen flex items-center justify-center text-center">
      <div className="w-full max-w-md px-6">{children}</div>
    </main>
  )
}
