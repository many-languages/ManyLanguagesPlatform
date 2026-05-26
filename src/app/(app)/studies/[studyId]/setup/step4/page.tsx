import { Suspense } from "react"
import { notFound } from "next/navigation"
import {
  Step4Content,
  SetupStepHeader,
  SetupContentSkeleton,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (
      message.includes("not authorized") ||
      message.includes("Not authenticated") ||
      message.includes("not found")
    ) {
      notFound()
    }
    throw error
  }
}

export default async function Step4Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <Suspense fallback={<SetupContentSkeleton />}>
      <Step4ContentWrapper studyId={studyId} study={study} />
    </Suspense>
  )
}
