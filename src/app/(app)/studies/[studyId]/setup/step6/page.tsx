import { Alert } from "@/src/components/ui/Alert"
import {
  Step6Content,
  SetupStepHeader,
  loadStudySetupPage,
  type StudyWithRelations,
} from "@/src/features/studies"
import { getFeedbackStep6DataRsc } from "@/src/features/feedback"

async function Step6ContentWrapper({
  studyId,
  study,
}: {
  studyId: number
  study: StudyWithRelations
}) {
  const feedbackStepData = await getFeedbackStep6DataRsc(studyId)
  if (feedbackStepData.kind === "error") {
    return (
      <>
        <SetupStepHeader studyId={studyId} title="Step 6 – Feedback" />
        <Alert variant="error" className="mt-4" title="Could not load feedback preview">
          <p>{feedbackStepData.message}</p>
        </Alert>
      </>
    )
  }

  const latestUploadWithExtraction = study.latestJatosStudyUpload
  const approvedExtraction = latestUploadWithExtraction?.approvedExtraction ?? null

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 6 – Feedback" />
      <Step6Content
        study={study}
        initialFeedbackTemplate={feedbackStepData.initialFeedbackTemplate}
        validation={feedbackStepData.validation}
        approvedExtractionId={approvedExtraction?.id ?? null}
        approvedExtractionApprovedAt={approvedExtraction?.approvedAt ?? null}
        previewClient={feedbackStepData.previewClient}
        feedbackPreviewContextKey={feedbackStepData.feedbackPreviewContextKey}
      />
    </>
  )
}

export default async function Step6Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return <Step6ContentWrapper studyId={studyId} study={study} />
}
