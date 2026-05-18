export default function DashboardSkeleton() {
  return (
    <main>
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-48 w-full rounded-xl" />
        ))}
      </div>
    </main>
  )
}
