export default function SetupContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-1/3 bg-gray-300 rounded mx-auto"></div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-300 rounded"></div>
        <div className="h-4 w-5/6 bg-gray-300 rounded"></div>
        <div className="h-4 w-4/6 bg-gray-300 rounded"></div>
      </div>
      <div className="h-10 w-32 bg-gray-300 rounded"></div>
    </div>
  )
}
