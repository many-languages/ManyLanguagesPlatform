"use client"

import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useRef, useState } from "react"

import { toast } from "react-hot-toast"
import StepNavigation from "../StepNavigation"
import {
  FeedbackStepEditor,
  type FeedbackPreviewContextClientDto,
  type FeedbackStepEditorState,
  type FeedbackFormEditorRef,
  type FeedbackTemplateEditorInitial,
  type FeedbackTemplateValidation,
} from "@/src/features/feedback"
import { useNotificationMenuContext } from "@/src/features/notifications"
import { studyPath } from "../../../../domain/setup/setupRoutes"
import { getSetupCompletionAction } from "../../../../actions/getSetupCompletionAction"
import type { StudyWithRelations } from "../../../../types"

interface Step6ContentProps {
  initialFeedbackTemplate?: FeedbackTemplateEditorInitial | null
  validation: FeedbackTemplateValidation
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
  /** UI-safe metadata for pilot selection; no enriched JATOS payloads. */
  previewClient: FeedbackPreviewContextClientDto
  /** Empty when preview context was not stored (no pilots). */
  feedbackPreviewContextKey: string
  study: StudyWithRelations
}

export default function Step6Content({
  initialFeedbackTemplate = null,
  validation,
  approvedExtractionId,
  approvedExtractionApprovedAt,
  previewClient,
  feedbackPreviewContextKey,
  study,
}: Step6ContentProps) {
  const router = useRouter()
  const studyId = study.id
  const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)
  const { refetch: refetchNotifications } = useNotificationMenuContext()
  const [stepState, setStepState] = useState<FeedbackStepEditorState>({
    disableNext: !previewClient.hasPilotData,
    nextTooltip: previewClient.hasPilotData ? undefined : "No pilot data found.",
  })

  const handleFinish = async () => {
    let setupCompleteFromServer: boolean

    if (feedbackEditorRef.current) {
      const editorIsDirty = !feedbackEditorRef.current.isTemplateSaved()
      if (editorIsDirty) {
        const saveResult = await feedbackEditorRef.current.saveTemplate({
          silentSuccessToast: true,
        })
        if (!saveResult.ok) {
          return
        }
        setupCompleteFromServer = saveResult.setupComplete
      } else {
        const { setupComplete } = await getSetupCompletionAction(studyId)
        setupCompleteFromServer = setupComplete
      }
    } else {
      const { setupComplete } = await getSetupCompletionAction(studyId)
      setupCompleteFromServer = setupComplete
    }

    await refetchNotifications()
    router.replace(studyPath(studyId) as Route)

    if (setupCompleteFromServer) {
      const isApproved = study.adminApproved === true
      toast.success(
        isApproved
          ? "Setup complete! You can launch your study when ready."
          : "Setup complete. Your study is pending admin approval."
      )
    }
  }

  return (
    <>
      <FeedbackStepEditor
        ref={feedbackEditorRef}
        studyId={studyId}
        initialFeedbackTemplate={initialFeedbackTemplate}
        validation={validation}
        approvedExtractionId={approvedExtractionId}
        approvedExtractionApprovedAt={approvedExtractionApprovedAt}
        previewClient={previewClient}
        feedbackPreviewContextKey={feedbackPreviewContextKey}
        onTemplateSaved={() => {
          // Refresh to get updated study data (step6Completed will be updated)
          router.refresh()
        }}
        onStepStateChange={setStepState}
      />
      <StepNavigation
        studyId={studyId}
        prev="step5"
        next="study"
        nextLabel="Finish Setup"
        onNext={handleFinish}
        disableNext={stepState.disableNext}
        nextTooltip={stepState.nextTooltip}
      />
    </>
  )
}
