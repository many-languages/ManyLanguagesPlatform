import { notFound } from "next/navigation"
import Step2Content from "./components/client/Step2Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getStudyRsc } from "../../../queries/getStudy"

export default async function Step2Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  const study = await getStudyRsc(studyId)

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 2 – JATOS setup" />
      <Step2Content study={study} />
    </>
  )
}
