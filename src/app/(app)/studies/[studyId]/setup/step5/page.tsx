import { notFound } from "next/navigation"
import Step5Content from "./components/client/Step5Content"
import SaveExitButton from "../components/client/SaveExitButton"
import { getFeedbackTemplateRsc } from "../../feedback/queries/getFeedbackTemplate"
import { getAllTestResultsRsc } from "@/src/app/(app)/studies/[studyId]/utils/getAllTestResults"

async function Step5ContentWrapper({ studyId }: { studyId: number }) {
  // Fetch feedback template server-side
  const feedbackTemplate = await getFeedbackTemplateRsc(studyId)

  // Fetch all test results
  const allTestResults = await getAllTestResultsRsc(studyId)

  // Select the latest test result (first one since sorted by id descending)
  const latestTestResult = allTestResults.length > 0 ? allTestResults[0] : null

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <SaveExitButton />
        <h2 className="text-xl font-semibold text-center flex-1">Step 5 – Feedback</h2>
        <div className="w-32" /> {/* Spacer to balance the layout */}
      </div>
      <Step5Content
        initialFeedbackTemplate={feedbackTemplate}
        enrichedResult={latestTestResult}
        allTestResults={allTestResults}
      />
    </>
  )
}

export default async function Step5Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  return <Step5ContentWrapper studyId={studyId} />
}
