import { Suspense } from "react"
import { notFound } from "next/navigation"
import {
  Step4Content,
  SetupStepHeader,
  getValidationDataRsc,
  loadStudySetupPage,
  type StudyWithRelations,
} from "@/src/features/studies"

async function Step4ContentWrapper({
  studyId,
  study,
}: {
  studyId: number
  study: StudyWithRelations
}) {
  try {
    const validationData = await getValidationDataRsc(studyId)
    return (
      <>
        <SetupStepHeader studyId={studyId} title="Step 4 – Extraction Review" />
        <Step4Content validationData={validationData} study={study} />
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
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <Suspense fallback={<div className="skeleton h-96 w-full" />}>
      <Step4ContentWrapper studyId={studyId} study={study} />
    </Suspense>
  )
}
