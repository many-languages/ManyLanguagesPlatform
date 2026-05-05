"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Alert } from "@/src/components/ui/Alert"
import FeedbackFormEditor from "./FeedbackFormEditor"
import type {
  FeedbackFormEditorRef,
  FeedbackPreviewContextClientDto,
  FeedbackTemplateEditorInitial,
  FeedbackTemplateValidation,
} from "../types"

export interface FeedbackStepEditorState {
  disableNext: boolean
  nextTooltip?: string
}

export interface FeedbackStepEditorProps {
  studyId: number
  initialFeedbackTemplate?: FeedbackTemplateEditorInitial | null
  validation: FeedbackTemplateValidation
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
  previewClient: FeedbackPreviewContextClientDto
  feedbackPreviewContextKey: string
  onTemplateSaved?: () => void
  onStepStateChange?: (state: FeedbackStepEditorState) => void
}

const INVALID_TEMPLATE_TOOLTIP =
  "Please fix validation errors in the feedback template before finishing."

const FeedbackStepEditor = forwardRef<FeedbackFormEditorRef, FeedbackStepEditorProps>(
  (
    {
      studyId,
      initialFeedbackTemplate = null,
      validation,
      approvedExtractionId,
      approvedExtractionApprovedAt,
      previewClient,
      feedbackPreviewContextKey,
      onTemplateSaved,
      onStepStateChange,
    },
    ref
  ) => {
    const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)
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

    useEffect(() => {
      const disableNext = !previewClient.hasPilotData || !isTemplateValid
      const nextTooltip = !previewClient.hasPilotData
        ? "No pilot data found."
        : !isTemplateValid
        ? INVALID_TEMPLATE_TOOLTIP
        : undefined

      onStepStateChange?.({ disableNext, nextTooltip })
    }, [isTemplateValid, onStepStateChange, previewClient.hasPilotData])

    useImperativeHandle(ref, () => ({
      saveTemplate: async (options) => {
        if (!feedbackEditorRef.current) {
          return { ok: false }
        }
        return feedbackEditorRef.current.saveTemplate(options)
      },
      isTemplateSaved: () => feedbackEditorRef.current?.isTemplateSaved() ?? true,
    }))

    if (!previewClient.hasPilotData) {
      return <Alert variant="warning">No pilot data found.</Alert>
    }

    return (
      <>
        {showInvalidKeys && (
          <Alert variant="warning">
            <div className="space-y-2">
              <p>
                This feedback template no longer matches the latest extraction. Please review and
                save the template again to complete Step 6.
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
          onTemplateSaved={onTemplateSaved}
          onValidationChange={setIsTemplateValid}
          hiddenVariables={previewClient.hiddenVariables}
        />
      </>
    )
  }
)

FeedbackStepEditor.displayName = "FeedbackStepEditor"

export default FeedbackStepEditor
