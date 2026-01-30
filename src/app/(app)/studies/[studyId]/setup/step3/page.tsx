import { notFound } from "next/navigation"
import Step3Content from "./components/client/Step3Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getStudyRsc } from "../../../queries/getStudy"

export default async function Step3Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  const study = await getStudyRsc(studyId)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 3 – Test run" />
      <Step3Content study={study} />
    </>
  )
}
