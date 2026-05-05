import StudyListSkeleton from "./StudyListSkeleton"
import PaginationControlsSkeleton from "./PaginationControlsSkeleton"

export default function ExploreSkeleton() {
  return (
    <main>
      <div className="flex justify-center mb-2">
        <div className="skeleton h-9 w-32" />
      </div>
      <StudyListSkeleton />
      <PaginationControlsSkeleton />
    </main>
  )
}
