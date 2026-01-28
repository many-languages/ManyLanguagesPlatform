import { notFound } from "next/navigation"
import Step2Content from "./components/client/Step2Content"
import SaveExitButton from "../components/client/SaveExitButton"
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
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton studyId={studyId} />
        <h2 className="text-xl font-semibold text-center flex-1">Step 2 – JATOS setup</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step2Content study={study} />
    </>
  )
}
