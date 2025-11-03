import { notFound } from "next/navigation"
import { getStudyRsc } from "../../../queries/getStudy"
import Step2Content from "./components/client/Step2Content"

export default async function Step2Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const study = await getStudyRsc(studyId)

    return (
      <>
        <h2 className="text-lg font-semibold mb-4 text-center">Step 2 – JATOS setup</h2>
        <Step2Content study={study} studyId={studyId} />
      </>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
