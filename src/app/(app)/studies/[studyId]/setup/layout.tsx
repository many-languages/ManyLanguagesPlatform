import { notFound, redirect } from "next/navigation"
import {
  StepIndicator,
  canEditStudySetup,
  loadStudySetupPage,
  studyPath,
  getCompletedSteps,
} from "@/src/features/studies"

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

  const { study } = await loadStudySetupPage(params)

  if (!canEditStudySetup(study)) {
    redirect(studyPath(studyId))
  }

  const completedSteps = getCompletedSteps(study)

  return (
    <div className="max-w-6xl mx-auto mt-10">
      <StepIndicator completedSteps={completedSteps} />
      <div className="card bg-base-200 p-6 shadow-md mt-4">{children}</div>
    </div>
  )
}
