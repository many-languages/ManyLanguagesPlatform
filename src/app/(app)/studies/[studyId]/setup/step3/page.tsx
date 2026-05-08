import { Step3Content, SetupStepHeader, loadStudySetupPage } from "@/src/features/studies"

export default async function Step3Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 3 – Test run" />
      <Step3Content study={study} />
    </>
  )
}
