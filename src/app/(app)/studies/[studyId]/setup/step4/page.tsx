import { Suspense } from "react"
import { notFound } from "next/navigation"
import Step4Content from "./components/client/Step4Content"
import SaveExitButton from "../components/client/SaveExitButton"
import { getValidationDataRsc } from "../../debug/utils/getValidationData"

async function Step4ContentWrapper({ studyId }: { studyId: number }) {
  try {
    // Access verification happens inside getValidationDataRsc
    const validationData = await getValidationDataRsc(studyId)
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <SaveExitButton />
          <h2 className="text-xl font-semibold text-center flex-1">Step 4 – Debug</h2>
          <div className="w-32" /> {/* Spacer to balance the layout */}
        </div>
        <Step4Content validationData={validationData} />
      </>
    )
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

export default async function Step4Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return (
    <Suspense fallback={<div className="skeleton h-96 w-full" />}>
      <Step4ContentWrapper studyId={studyId} />
    </Suspense>
  )
}
