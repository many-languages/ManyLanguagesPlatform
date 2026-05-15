import { Step3Content, SetupStepHeader, loadStudySetupPage } from "@/src/features/studies"
import { getResearcherRunUrlRsc } from "@/src/features/studies/server/getResearcherRunUrl"

export default async function Step3Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)
  const runUrlData = await getResearcherRunUrlRsc(studyId).catch(() => null)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 3 – Test run" />
      <Step3Content study={study} initialRunUrl={runUrlData?.jatosRunUrl ?? null} />
    </>
  )
}
