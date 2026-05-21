import { Suspense } from "react"
import { notFound } from "next/navigation"
import DebugContent from "@/src/features/studies/ui/researcher/inspector/DebugContent"
import { getValidationDataRsc } from "@/src/features/studies/server/getValidationData"
import InspectorSkeleton from "@/src/features/studies/ui/InspectorSkeleton"
import { parseStudyIdParam } from "@/src/features/studies"

export default async function InspectorPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = parseStudyIdParam(studyIdRaw)

  if (studyId === null) {
    notFound()
  }

  return (
    <main className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">JATOS Data Inspector</h1>
        <p className="text-muted-content mt-2">
          Advanced technical inspection for JATOS metadata, study properties, pilot results, and
          variable extraction.
        </p>
      </div>

      <Suspense fallback={<InspectorSkeleton />}>
        <InspectorContent studyId={studyId} />
      </Suspense>
    </main>
  )
}

async function InspectorContent({ studyId }: { studyId: number }) {
  try {
    const validationData = await getValidationDataRsc(studyId)
    return <DebugContent validationData={validationData} />
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("not authorized") ||
        error.message.includes("Not authenticated") ||
        error.message.includes("not found"))
    ) {
      notFound()
    }
    throw error
  }
}
