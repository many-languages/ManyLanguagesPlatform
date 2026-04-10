import Step2Content from "./components/client/Step2Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { loadStudySetupPage } from "../utils/loadStudySetupPage"

export default async function Step2Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 2 – JATOS setup" />
      <Step2Content study={study} />
    </>
  )
}
