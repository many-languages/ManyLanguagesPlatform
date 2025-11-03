import { Suspense } from "react"
import StepPageWrapper from "../components/StepPageWrapper"
import { getStudyDataByCommentRsc } from "../../../queries/getStudyDataByComment"
import { getFeedbackTemplateRsc } from "./queries/getFeedbackTemplate"
import { Alert } from "@/src/app/components/Alert"
import Step4Content from "./components/client/Step4Content"
import SetupContentSkeleton from "../components/SetupContentSkeleton"
import { StudyWithRelations } from "../../../queries/getStudy"

async function Step4DataFetcher({
  studyId,
  study,
}: {
  studyId: number
  study: StudyWithRelations
}) {
  const [data, feedbackTemplate] = await Promise.all([
    getStudyDataByCommentRsc(studyId, "test").catch(() => null),
    getFeedbackTemplateRsc(studyId).catch(() => null),
  ])

  if (!data?.enrichedResult) {
    return <Alert variant="warning">No test run data found.</Alert>
  }

  return (
    <Step4Content
      study={study}
      studyId={studyId}
      enrichedResult={data.enrichedResult}
      feedbackTemplate={feedbackTemplate}
    />
  )
}

export default function Step4Page() {
  return (
    <StepPageWrapper>
      {(study, studyId) => (
        <>
          <h2 className="text-lg font-semibold mb-4">Step 4 – Feedback</h2>
          <Suspense fallback={<SetupContentSkeleton />}>
            <Step4DataFetcher studyId={studyId} study={study} />
          </Suspense>
        </>
      )}
    </StepPageWrapper>
  )
}
