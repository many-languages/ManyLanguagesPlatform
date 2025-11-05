import StudyListSkeleton from "../../studies/components/skeletons/StudyListSkeleton"
import PaginationControlsSkeleton from "../../studies/components/skeletons/PaginationControlsSkeleton"

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
