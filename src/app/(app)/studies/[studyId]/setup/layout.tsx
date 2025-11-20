import { Suspense } from "react"
import { notFound } from "next/navigation"

import StepIndicator from "./components/client/StepIndicator"
import { StudySetupProvider } from "./components/client/StudySetupProvider"
import SetupContentSkeleton from "./components/skeletons/SetupContentSkeleton"
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
    // Fetch study data once in layout - will be preserved across step navigation
    const study = await getStudyRsc(studyId)

    // Calculate completed steps for the indicator
    const completedSteps = getCompletedSteps(study)

    return (
      <StudySetupProvider study={study} studyId={studyId}>
        <div className="max-w-4xl mx-auto mt-10">
          {/* Step indicator - client component detects current step from pathname */}
          <StepIndicator completedSteps={completedSteps} />
          <div className="card bg-base-200 p-6 shadow-md mt-4">{children}</div>
        </div>
      </StudySetupProvider>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}
