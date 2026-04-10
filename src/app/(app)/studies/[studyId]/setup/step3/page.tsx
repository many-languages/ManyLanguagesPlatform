import Step3Content from "./components/client/Step3Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { loadStudySetupPage } from "../utils/loadStudySetupPage"

export default async function Step3Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 3 – Test run" />
      <Step3Content study={study} />
    </>
  )
}
