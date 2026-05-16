export function SkeletonPageTitle({ width = "w-48" }: { width?: string }) {
  return (
    <div className="flex justify-center mb-2">
      <div className={`skeleton h-9 ${width}`} />
    </div>
  )
}
