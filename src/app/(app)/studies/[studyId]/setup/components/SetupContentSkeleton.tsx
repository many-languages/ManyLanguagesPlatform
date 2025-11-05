export default function SetupContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Form fields skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-300 rounded"></div>
          <div className="h-10 w-full bg-gray-300 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
          <div className="h-10 w-full bg-gray-300 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-300 rounded"></div>
          <div className="h-24 w-full bg-gray-300 rounded"></div>
        </div>
      </div>
      {/* Action buttons skeleton */}
      <div className="flex justify-end gap-2 mt-6">
        <div className="h-10 w-24 bg-gray-300 rounded"></div>
        <div className="h-10 w-32 bg-gray-300 rounded"></div>
      </div>
    </div>
  )
}
