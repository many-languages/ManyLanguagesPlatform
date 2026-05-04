import StudyListSkeleton from "@/src/features/studies/ui/shared/StudyListSkeleton"
import PaginationControlsSkeleton from "@/src/features/studies/ui/shared/PaginationControlsSkeleton"

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
