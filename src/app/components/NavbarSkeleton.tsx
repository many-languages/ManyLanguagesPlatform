export default function NavbarSkeleton() {
  return (
    <div className="navbar bg-base-100 sticky shadow-sm border-b border-gray-300">
      {/* Title */}
      <div className="flex-1">
        <div className="skeleton h-8 w-48 rounded" />
      </div>

      {/* Navigation */}
      <div className="flex-none px-6">
        {/* Tabs skeleton */}
        <div className="flex gap-4 px-6">
          <div className="skeleton h-6 w-20 rounded" />
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-6 w-20 rounded" />
        </div>

        {/* Profile avatar skeleton */}
        <div className="skeleton h-10 w-10 rounded-full" />
      </div>
    </div>
  )
}
