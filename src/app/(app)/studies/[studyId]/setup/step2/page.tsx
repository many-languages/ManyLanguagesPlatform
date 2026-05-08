import { Step2Content, SetupStepHeader, loadStudySetupPage } from "@/src/features/studies"

export default async function Step2Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 2 – JATOS setup" />
      <Step2Content study={study} />
    </>
  )
}
