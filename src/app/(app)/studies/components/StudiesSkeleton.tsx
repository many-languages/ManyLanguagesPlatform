import StudyListSkeleton from "./skeletons/StudyListSkeleton"
import PaginationControlsSkeleton from "./skeletons/PaginationControlsSkeleton"

export default function StudiesSkeleton() {
  return (
    <main>
      <div className="flex justify-center mb-2">
        <div className="skeleton h-9 w-40" />
      </div>
      <div className="flex justify-end mb-2">
        <div className="skeleton h-10 w-32" />
      </div>
      <div className="skeleton h-10 w-32 mb-2" />
      <StudyListSkeleton />
      <PaginationControlsSkeleton />
    </main>
  )
}
