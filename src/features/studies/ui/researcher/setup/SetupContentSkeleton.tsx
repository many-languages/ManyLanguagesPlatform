export default function SetupContentSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="space-y-4 w-full">
        <div className="space-y-2 w-full">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-10 w-full" />
        </div>
        <div className="space-y-2 w-full">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-10 w-full" />
        </div>
        <div className="space-y-2 w-full">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6 w-full">
        <div className="skeleton h-10 w-24" />
        <div className="skeleton h-10 w-32" />
      </div>
    </div>
  )
}
