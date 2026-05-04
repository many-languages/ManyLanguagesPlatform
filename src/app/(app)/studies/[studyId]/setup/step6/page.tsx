import { Alert } from "@/src/app/components/Alert"
import {
  Step6Content,
  SetupStepHeader,
  loadStudySetupPage,
  type StudyWithRelations,
} from "@/src/features/studies"
import { getFeedbackTemplateRsc } from "@/src/features/feedback"
import { loadFeedbackPreviewContext } from "@/src/features/feedback/server/loadFeedbackPreviewContext"
import { computeFeedbackTemplateValidation } from "@/src/features/feedback/server/computeFeedbackTemplateValidation"

async function Step6ContentWrapper({
  studyId,
  study,
}: {
  studyId: number
  study: StudyWithRelations
}) {
  const previewLoad = await loadFeedbackPreviewContext(studyId)

  if (previewLoad.kind === "error") {
    return (
      <>
        <SetupStepHeader studyId={studyId} title="Step 6 – Feedback" />
        <Alert variant="error" className="mt-4" title="Could not load feedback preview">
          <p>{previewLoad.message}</p>
        </Alert>
      </>
    )
  }

  const feedbackTemplate = await getFeedbackTemplateRsc(studyId)
  const templateValidation = await computeFeedbackTemplateValidation(studyId)

  const latestUploadWithExtraction = study.latestJatosStudyUpload
  const approvedExtraction = latestUploadWithExtraction?.approvedExtraction ?? null

  return (
    <>
      <SetupStepHeader studyId={studyId} title="Step 6 – Feedback" />
      <Step6Content
        study={study}
        initialFeedbackTemplate={feedbackTemplate}
        validation={templateValidation}
        approvedExtractionId={approvedExtraction?.id ?? null}
        approvedExtractionApprovedAt={approvedExtraction?.approvedAt ?? null}
        previewClient={previewLoad.client}
        feedbackPreviewContextKey={previewLoad.contextKey}
      />
    </>
  )
}

export default async function Step6Page({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId, study } = await loadStudySetupPage(params)

  return <Step6ContentWrapper studyId={studyId} study={study} />
}
