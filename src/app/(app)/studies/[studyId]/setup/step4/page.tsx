import { Suspense } from "react"
import { notFound } from "next/navigation"
import Step4Content from "./components/client/Step4Content"
import SetupContentSkeleton from "../components/skeletons/SetupContentSkeleton"
import { getFeedbackTemplateRsc } from "../../feedback/queries/getFeedbackTemplate"
import { getAllTestResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllTestResults"

async function Step4ContentWrapper({ studyId }: { studyId: number }) {
  // Fetch feedback template server-side
  const feedbackTemplate = await getFeedbackTemplateRsc(studyId)

  // Fetch all test results
  const allTestResults = await getAllTestResultsRsc(studyId)

  // Select the latest test result (first one since sorted by id descending)
  const latestTestResult = allTestResults.length > 0 ? allTestResults[0] : null

  return (
    <Step4Content
      initialFeedbackTemplate={feedbackTemplate}
      enrichedResult={latestTestResult}
      allTestResults={allTestResults}
    />
  )
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
