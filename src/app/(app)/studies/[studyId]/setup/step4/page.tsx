import { notFound } from "next/navigation"
import { getStudyRsc } from "../../../queries/getStudy"
import { getStudyDataByCommentRsc } from "../../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "./queries/getFeedbackTemplate"
import Step4Content from "./components/client/Step4Content"

export default async function Step4Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId: studyIdRaw } = await params
  const studyId = Number(studyIdRaw)

  if (!Number.isFinite(studyId)) {
    notFound()
  }

  try {
    const [study, data, feedbackTemplate] = await Promise.all([
      getStudyRsc(studyId),
      getStudyDataByCommentRsc(studyId, "test").catch(() => null),
      getFeedbackTemplateRsc(studyId).catch(() => null),
    ])

    if (!data?.enrichedResult) {
      return (
        <>
          <h2 className="text-lg font-semibold mb-4">Step 4 – Feedback</h2>
          <p className="text-warning">No test run data found.</p>
        </>
      )
    }

    return (
      <>
        <h2 className="text-lg font-semibold mb-4">Step 4 – Feedback</h2>
        <Step4Content
          study={study}
          studyId={studyId}
          enrichedResult={data.enrichedResult}
          feedbackTemplate={feedbackTemplate}
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
