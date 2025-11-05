import { Suspense } from "react"
import { notFound } from "next/navigation"
import Step4Content from "./components/client/Step4Content"
import SetupContentSkeleton from "../components/SetupContentSkeleton"
import { getFeedbackTemplateRsc } from "./queries/getFeedbackTemplate"

async function Step4ContentWrapper({ studyId }: { studyId: number }) {
  // Fetch feedback template server-side
  const feedbackTemplate = await getFeedbackTemplateRsc(studyId)

  return <Step4Content initialFeedbackTemplate={feedbackTemplate} />
}

export default async function Step4Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Step 4 – Feedback</h2>
      <Suspense fallback={<SetupContentSkeleton />}>
        <Step4ContentWrapper studyId={studyId} />
      </Suspense>
    </>
  )
}
