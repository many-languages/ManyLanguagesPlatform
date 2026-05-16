import StudyListSkeleton from "./StudyListSkeleton"
import PaginationControlsSkeleton from "./PaginationControlsSkeleton"
import { SkeletonPageTitle } from "@/components/ui/SkeletonPageTitle"

export default function ExploreSkeleton() {
  return (
    <main>
      <SkeletonPageTitle width="w-32" />
      <StudyListSkeleton />
      <PaginationControlsSkeleton />
    </main>
  )
}
