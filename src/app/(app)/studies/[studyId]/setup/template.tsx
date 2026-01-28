import { notFound } from "next/navigation"
import StepIndicator from "./components/client/StepIndicator"
import { getStudySetupStatusRsc } from "../../queries/getStudy"
import { getCompletedSteps } from "./utils/setupStatus"

export default async function StudySetupTemplate({
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
    // Fetches fresh status on every navigation, ensuring the indicator is always up to date
    const study = await getStudySetupStatusRsc(studyId)

    // Calculate completed steps for the indicator
    const completedSteps = getCompletedSteps(study)

    return (
      <>
        {/* Step indicator - client component detects current step from pathname */}
        <StepIndicator completedSteps={completedSteps} />
        {children}
      </>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
