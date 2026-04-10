import { Suspense } from "react"
import { notFound } from "next/navigation"
import Step4Content from "./components/client/Step4Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getValidationDataRsc } from "../../inspector/utils/getValidationData"
import { loadStudySetupPage } from "../utils/loadStudySetupPage"
import type { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"

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
