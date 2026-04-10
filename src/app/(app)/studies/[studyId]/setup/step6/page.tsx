import Step6Content from "./components/client/Step6Content"
import SetupStepHeader from "../components/client/SetupStepHeader"
import { getFeedbackTemplateRsc } from "../../feedback/queries/getFeedbackTemplate"
import { loadFeedbackPreviewContext } from "../../feedback/utils/loadFeedbackPreviewContext"
import { computeFeedbackTemplateValidation } from "../../feedback/utils/computeFeedbackTemplateValidation"
import { loadStudySetupPage } from "../utils/loadStudySetupPage"
import type { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"
import { Alert } from "@/src/app/components/Alert"

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
