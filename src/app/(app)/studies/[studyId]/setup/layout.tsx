import { notFound } from "next/navigation"
import StepIndicator from "./components/client/StepIndicator"
import { getStudyRsc } from "../../queries/getStudy"
import { getCompletedSteps } from "./utils/setupStatus"

export default async function StudySetupLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ studyId: string }>
}) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const study = await getStudyRsc(studyId)
    const completedSteps = getCompletedSteps(study)

    return (
      <div className="max-w-6xl mx-auto mt-10">
        <StepIndicator completedSteps={completedSteps} />
        <div className="card bg-base-200 p-6 shadow-md mt-4">{children}</div>
      </div>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
