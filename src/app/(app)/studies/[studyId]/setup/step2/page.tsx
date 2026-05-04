import Step2Content from "@/src/features/studies/ui/researcher/setup/step2/Step2Content"
import SetupStepHeader from "@/src/features/studies/ui/researcher/setup/SetupStepHeader"
import { loadStudySetupPage } from "@/src/features/studies/server/loadStudySetupPage"

export default async function Step2Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 2 – JATOS setup" />
      <Step2Content study={study} />
    </>
  )
}
