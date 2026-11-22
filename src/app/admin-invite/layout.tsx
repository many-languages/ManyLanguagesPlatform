// Deliberately outside the `(auth)` group: logged-in users are redirected away from those routes,
// but accepting an admin invite requires being logged in.
export default function AdminInviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-2">{children}</div>
    </main>
  )
}
