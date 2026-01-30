import { Suspense } from "react"
import { notFound } from "next/navigation"
import DebugContent from "./components/client/DebugContent"
import { getValidationDataRsc } from "./utils/getValidationData"

export default async function DebugPage({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return (
    <main className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">JATOS Data Validation & Debug</h1>
        <p className="text-muted-content mt-2">
          Advanced technical inspection tool for JATOS metadata, data pipeline, and variable
          extraction
        </p>
      </div>

      <Suspense fallback={<div className="skeleton h-96 w-full" />}>
        <DebugContentWrapper studyId={studyId} />
      </Suspense>
    </main>
  )
}

async function DebugContentWrapper({ studyId }: { studyId: number }) {
  try {
    // Access verification happens inside getValidationDataRsc
    const validationData = await getValidationDataRsc(studyId)
    return <DebugContent validationData={validationData} />
  } catch (error: any) {
    if (
      error.message?.includes("not authorized") ||
      error.message?.includes("Not authenticated") ||
      error.message?.includes("not found")
    ) {
      notFound()
    }
    throw error
  }
}
