import { notFound } from "next/navigation"
import Step3Content from "./components/client/Step3Content"
import SaveExitButton from "../components/client/SaveExitButton"
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
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton studyId={studyId} />
        <h2 className="text-xl font-semibold text-center flex-1">Step 3 – Test run</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step3Content study={study} />
    </>
  )
}
