import StudyListSkeleton from "./StudyListSkeleton"
import PaginationControlsSkeleton from "./PaginationControlsSkeleton"
import { SkeletonPageTitle } from "@/components/ui/SkeletonPageTitle"

export default function StudiesSkeleton() {
  return (
    <main>
      <SkeletonPageTitle width="w-40" />
      <div className="flex justify-end mb-2">
        <div className="skeleton h-10 w-32" />
      </div>
      <div className="skeleton h-10 w-32 mb-2" />
      <StudyListSkeleton />
      <PaginationControlsSkeleton />
    </main>
  )
}
