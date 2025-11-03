import { notFound } from "next/navigation"
import { getStudyRsc } from "../../../queries/getStudy"
import { getResearcherRunUrlRsc } from "../queries/getResearcherRunUrl"
import Step3Content from "./components/client/Step3Content"

export default async function Step3Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const [study, researcher] = await Promise.all([
      getStudyRsc(studyId),
      getResearcherRunUrlRsc(studyId).catch(() => null),
    ])

    return (
      <>
        <h2 className="text-lg font-semibold mb-4 text-center">Step 3 – Test run</h2>
        <Step3Content
          study={study}
          studyId={studyId}
          researcherId={researcher?.id ?? null}
          jatosRunUrl={researcher?.jatosRunUrl ?? null}
        />
      </>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
