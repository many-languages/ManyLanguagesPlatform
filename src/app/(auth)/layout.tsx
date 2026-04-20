import type { UserRole } from "db"
import { getDefaultAuthenticatedPath } from "@/src/lib/auth/routing"
import { useAuthenticatedBlitzContext } from "../blitz-server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await useAuthenticatedBlitzContext({
    redirectAuthenticatedTo: (ctx) =>
      getDefaultAuthenticatedPath(ctx.session.role as UserRole | undefined),
  })
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-2">{children}</div>
    </main>
  )
}
