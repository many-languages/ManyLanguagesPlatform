import { notFound } from "next/navigation"
import { Step3Content, SetupStepHeader, parseStudyIdParam } from "@/src/features/studies"
import { getResearcherStudyRsc } from "@/src/features/studies/server/getStudy"
import { getResearcherRunUrlRsc } from "@/src/features/studies/server/getResearcherRunUrl"

export default async function Step3Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = parseStudyIdParam(studyIdRaw)

  if (studyId === null) {
    notFound()
  }

  let study
  let runUrlData

  try {
    ;[study, runUrlData] = await Promise.all([
      getResearcherStudyRsc(studyId),
      getResearcherRunUrlRsc(studyId).catch(() => null),
    ])
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 3 – Test run" />
      <Step3Content study={study} initialRunUrl={runUrlData?.jatosRunUrl ?? null} />
    </>
  )
}
