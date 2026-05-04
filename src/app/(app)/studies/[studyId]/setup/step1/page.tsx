import Step1Content from "@/src/features/studies/ui/researcher/setup/step1/Step1Content"
import SetupStepHeader from "@/src/features/studies/ui/researcher/setup/SetupStepHeader"
import { loadStudySetupPage } from "@/src/features/studies/server/loadStudySetupPage"

export default async function Step1Page({
  params,
  searchParams,
}: {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ edit?: string; returnTo?: string }>
}) {
  const { studyId, study } = await loadStudySetupPage(params)
  const searchParamsValue = await searchParams
  const isEditMode = searchParamsValue.edit === "true"
  const returnTo = searchParamsValue.returnTo || "step2"

  return (
    <>
      <SetupStepHeader
        studyId={studyId}
        title="Step 1 – General information"
        showBackToStudy={false}
      />
      <Step1Content study={study} studyId={studyId} isEditMode={isEditMode} returnTo={returnTo} />
    </>
  )
}
