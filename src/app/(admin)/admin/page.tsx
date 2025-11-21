export const metadata = {
  title: "Admin Console",
  description: "High-level controls for ManyLanguagesPlatform administrators",
}

export default function AdminHomePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Welcome, Admin</p>
        <h1 className="text-4xl font-semibold">Platform overview</h1>
        <p className="text-base-content/70 max-w-3xl">
          This area will host management tooling for researchers, participants, and deployments. Use
          the navigation above to explore the upcoming sections.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <p className="text-sm text-base-content/70">Next steps</p>
            <h2 className="card-title">Hook up data sources</h2>
            <p>Connect Prisma queries to display live platform metrics.</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <p className="text-sm text-base-content/70">Access control</p>
            <h2 className="card-title">Add server actions</h2>
            <p>Ensure every action checks `session.role === "ADMIN"` before mutating data.</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <p className="text-sm text-base-content/70">Observability</p>
            <h2 className="card-title">Stream updates</h2>
            <p>Use Suspense boundaries and streaming lists for long-running jobs.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
