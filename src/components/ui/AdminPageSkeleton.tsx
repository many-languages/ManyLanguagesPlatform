export function AdminPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-10 w-56" />
        <div className="skeleton h-4 w-96" />
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="skeleton h-48 w-full rounded-xl" />
      ))}
    </section>
  )
}
