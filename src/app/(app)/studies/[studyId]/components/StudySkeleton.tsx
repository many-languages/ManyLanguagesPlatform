export default function StudySkeleton() {
  return (
    <main className="p-6">
      {/* Title */}
      <div className="flex justify-center mb-6">
        <div className="skeleton h-8 w-2/3" />
      </div>

      {/* Card */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body">
          <h2 className="card-title">
            <div className="skeleton h-6 w-1/3" />
          </h2>

          <div className="flex flex-col gap-3 mt-4">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/3" />
          </div>

          <div className="card-actions justify-end mt-6">
            <div className="skeleton h-10 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </main>
  )
}
