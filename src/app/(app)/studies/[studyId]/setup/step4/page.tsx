import { Suspense } from "react"
import { notFound } from "next/navigation"
import Step4Content from "@/src/features/studies/ui/researcher/setup/step4/Step4Content"
import SetupStepHeader from "@/src/features/studies/ui/researcher/setup/SetupStepHeader"
import { getValidationDataRsc } from "@/src/features/studies/server/getValidationData"
import { loadStudySetupPage } from "@/src/features/studies/server/loadStudySetupPage"
import type { StudyWithRelations } from "@/src/features/studies/queries/getStudy"

async function Step4ContentWrapper({
  studyId,
  study,
}: {
  studyId: number
  study: StudyWithRelations
}) {
  try {
    // Access verification happens inside getValidationDataRsc
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
