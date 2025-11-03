import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getStudyRsc } from "../../../queries/getStudy"
import StepIndicator from "./components/StepIndicator"
import { StudySetupProvider } from "./components/StudySetupProvider"
import SetupContentSkeleton from "./components/SetupContentSkeleton"

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

    return (
      <StudySetupProvider study={study} studyId={studyId}>
        <div className="max-w-4xl mx-auto mt-10">
          {/* Step indicator */}
          <StepIndicator />
          <div className="card bg-base-200 p-6 shadow-md">
            {/* Suspense boundary for progressive loading of step-specific data */}
            <Suspense fallback={<SetupContentSkeleton />}>{children}</Suspense>
          </div>
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
