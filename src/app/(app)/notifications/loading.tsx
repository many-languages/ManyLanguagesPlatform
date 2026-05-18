export default function Loading() {
  return (
    <main className="flex flex-col mx-auto w-full gap-6">
      <header className="flex flex-col items-center gap-2">
        <div className="skeleton h-9 w-48" />
      </header>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton h-10 w-32" />
        <div className="skeleton h-10 w-36" />
      </section>

      <div className="skeleton h-10 w-full rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full rounded-xl" />
      ))}
    </main>
  )
}
