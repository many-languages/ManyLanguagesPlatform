"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { toast } from "react-hot-toast"
import StepNavigation from "../../../components/client/StepNavigation"
import { Alert } from "@/src/app/components/Alert"
import {
  FeedbackFormEditorRef,
  type FeedbackTemplateEditorInitial,
} from "../../../../feedback/types"
import FeedbackFormEditor from "../../../../feedback/components/client/FeedbackFormEditor"
import { useNotificationMenuContext } from "@/src/app/(app)/notifications/context/NotificationMenuContext"
import type { FeedbackPreviewContextClientDto } from "../../../../feedback/utils/loadFeedbackPreviewContext"

import { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"
import { getSetupCompletionAction } from "../../../actions/getSetupCompletionAction"

interface Step6ContentProps {
  initialFeedbackTemplate?: FeedbackTemplateEditorInitial | null
  validation: {
    status: "VALID" | "INVALID" | "NO_TEMPLATE" | "NO_EXTRACTION"
    missingVariableNames: string[]
    extraVariableNames: string[]
  }
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
  const [isTemplateValid, setIsTemplateValid] = useState(true)

  const { missingVariableNames, extraVariableNames } = validation
  const validationStatus = validation.status
  const templateUpdatedAt = initialFeedbackTemplate?.updatedAt
    ? new Date(initialFeedbackTemplate.updatedAt)
    : null
  const approvedExtractionAt = approvedExtractionApprovedAt
    ? new Date(approvedExtractionApprovedAt)
    : null
  const showInvalidKeys =
    validationStatus === "INVALID" &&
    (missingVariableNames.length > 0 || extraVariableNames.length > 0)
  const showSoftWarning =
    validationStatus === "VALID" &&
    approvedExtractionId !== null &&
    approvedExtractionAt !== null &&
    templateUpdatedAt !== null &&
    templateUpdatedAt < approvedExtractionAt

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
    router.replace(`/studies/${studyId}`)

    if (setupCompleteFromServer) {
      const isApproved = study.adminApproved === true
      toast.success(
        isApproved
          ? "Setup complete! You can activate your study when ready."
          : "Setup complete. Your study is pending admin approval."
      )
    }
  }

  if (!previewClient.hasPilotData) {
    return <Alert variant="warning">No pilot data found.</Alert>
  }

  return (
    <>
      {showInvalidKeys && (
        <Alert variant="warning">
          <div className="space-y-2">
            <p>
              This feedback template no longer matches the latest extraction. Please review and save
              the template again to complete Step 6.
            </p>
            {missingVariableNames.length > 0 && (
              <div>
                <div className="font-semibold">Missing variables</div>
                <div className="text-sm">{missingVariableNames.join(", ")}</div>
              </div>
            )}
            {extraVariableNames.length > 0 && (
              <div>
                <div className="font-semibold">Additional variables</div>
                <div className="text-sm">{extraVariableNames.join(", ")}</div>
              </div>
            )}
          </div>
        </Alert>
      )}
      {showSoftWarning && (
        <Alert variant="info">
          A new extraction was approved for this study version. The variables match your existing
          template, but we recommend reviewing it again.
        </Alert>
      )}
      <FeedbackFormEditor
        ref={feedbackEditorRef}
        initialTemplate={initialFeedbackTemplate}
        studyId={studyId}
        feedbackPreviewContextKey={feedbackPreviewContextKey}
        withinStudyResultId={previewClient.primaryPilotResultId ?? undefined}
        pilotResultCount={previewClient.pilotResultCount}
        variables={previewClient.variables}
        onTemplateSaved={() => {
          // Refresh to get updated study data (step6Completed will be updated)
          router.refresh()
        }}
        onValidationChange={setIsTemplateValid}
        hiddenVariables={previewClient.hiddenVariables}
      />
      <StepNavigation
        studyId={studyId}
        prev="step5"
        next="study"
        nextLabel="Finish Setup"
        onNext={handleFinish}
        disableNext={!isTemplateValid}
        nextTooltip="Please fix validation errors in the feedback template before finishing."
      />
    </>
  )
}
