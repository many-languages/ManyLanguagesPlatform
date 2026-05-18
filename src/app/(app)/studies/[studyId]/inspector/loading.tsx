import InspectorSkeleton from "@/src/features/studies/ui/InspectorSkeleton"

export default function Loading() {
  return (
    <main className="container mx-auto p-4">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-4 w-96" />
      </div>
      <InspectorSkeleton />
    </main>
  )
}
