"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { useMutation, useQuery } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"
import { isSetupComplete } from "../../../utils/setupStatus"
import updateStudyStatus from "@/src/app/(app)/studies/mutations/updateStudyStatus"
import StepNavigation from "../../../components/client/StepNavigation"
import { Alert } from "@/src/app/components/Alert"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { FeedbackFormEditorRef } from "../../../../feedback/types"
import FeedbackFormEditor from "../../../../feedback/components/client/FeedbackFormEditor"
import { useNotificationMenuContext } from "@/src/app/(app)/notifications/context/NotificationMenuContext"
import getCachedExtractionBundle from "../../../queries/getCachedExtractionBundle"
import runExtraction from "../../../mutations/runExtraction"
import type { SerializedExtractionBundle } from "../../../utils/serializeExtractionBundle"
import type { FeedbackVariable } from "../../../../feedback/types"

import { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"

interface Step6ContentProps {
  initialFeedbackTemplate?: {
    id: number
    content: string
    createdAt: Date | string
    updatedAt: Date | string
    validatedExtractionId?: number | null
    validationStatus?: "NEEDS_REVIEW" | "VALID" | "INVALID"
    validatedAt?: Date | string | null
    missingKeys?: string[] | null
    extraKeys?: string[] | null
  } | null
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
  enrichedResult: EnrichedJatosStudyResult | null
  allPilotResults: EnrichedJatosStudyResult[]
  pilotResultId: number | null
  variables: FeedbackVariable[]
  hiddenVariables: string[]
  study: StudyWithRelations
}

export default function Step6Content({
  initialFeedbackTemplate = null,
  approvedExtractionId,
  approvedExtractionApprovedAt,
  enrichedResult,
  allPilotResults,
  pilotResultId,
  variables,
  hiddenVariables,
  study,
}: Step6ContentProps) {
  const router = useRouter()
  // const { study, studyId } = useStudySetup() // Removed context
  const studyId = study.id
  const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)
  const [updateStudyStatusMutation] = useMutation(updateStudyStatus)
  const { refetch: refetchNotifications } = useNotificationMenuContext()
  const [runExtractionMutation] = useMutation(runExtraction)
  const [extractionBundle, setExtractionBundle] = useState<SerializedExtractionBundle | null>(null)
  const latestUpload = study.latestJatosStudyUpload
  const step1Completed = latestUpload?.step1Completed ?? false
  const step2Completed = latestUpload?.step2Completed ?? false
  const step3Completed = latestUpload?.step3Completed ?? false
  const step4Completed = latestUpload?.step4Completed ?? false
  const step5Completed = latestUpload?.step5Completed ?? false
  const step6Completed = latestUpload?.step6Completed ?? false

  const missingKeys = Array.isArray(initialFeedbackTemplate?.missingKeys)
    ? (initialFeedbackTemplate?.missingKeys as string[])
    : []
  const extraKeys = Array.isArray(initialFeedbackTemplate?.extraKeys)
    ? (initialFeedbackTemplate?.extraKeys as string[])
    : []
  const validationStatus = initialFeedbackTemplate?.validationStatus ?? null
  const validatedExtractionId = initialFeedbackTemplate?.validatedExtractionId ?? null
  const templateUpdatedAt = initialFeedbackTemplate?.updatedAt
    ? new Date(initialFeedbackTemplate.updatedAt)
    : null
  const approvedExtractionAt = approvedExtractionApprovedAt
    ? new Date(approvedExtractionApprovedAt)
    : null
  const showInvalidKeys =
    validationStatus === "INVALID" && (missingKeys.length > 0 || extraKeys.length > 0)
  const showSoftWarning =
    validationStatus === "VALID" &&
    approvedExtractionId !== null &&
    validatedExtractionId === approvedExtractionId &&
    approvedExtractionAt !== null &&
    templateUpdatedAt !== null &&
    templateUpdatedAt < approvedExtractionAt

  const [cachedBundleResult, { isLoading: isCacheLoading }] = useQuery(
    getCachedExtractionBundle,
    { studyId, includeDiagnostics: false },
    { enabled: Boolean(pilotResultId) }
  )

  const [isTemplateValid, setIsTemplateValid] = useState(true)

  useEffect(() => {
    if (!pilotResultId) return
    if (isCacheLoading) return

    if (cachedBundleResult?.bundle) {
      setExtractionBundle(cachedBundleResult.bundle)
      return
    }
    runExtractionMutation({
      studyId,
      includeDiagnostics: false,
    })
      .then((result) => setExtractionBundle(result.bundle))
      .catch((error) => {
        console.error("Failed to run extraction for preview:", error)
      })
  }, [cachedBundleResult, pilotResultId, runExtractionMutation, studyId, isCacheLoading])

  const handleFinish = async () => {
    let templateSavedDuringFinish = false

    if (feedbackEditorRef.current) {
      const isSaved = feedbackEditorRef.current.isTemplateSaved()
      if (!isSaved) {
        // Auto-save template before finishing
        const success = await feedbackEditorRef.current.saveTemplate()
        if (!success) {
          // Save failed (likely due to validation errors), so we abort finish
          return
        }
        templateSavedDuringFinish = true
      }
    }

    const canAutoOpen =
      !!study &&
      step1Completed &&
      step2Completed &&
      step3Completed &&
      step4Completed &&
      step5Completed &&
      (step6Completed || templateSavedDuringFinish || !!initialFeedbackTemplate)

    // Check if setup is now complete and auto-open study
    if (canAutoOpen) {
      try {
        await updateStudyStatusMutation({ studyId, status: "OPEN" })
        await refetchNotifications()
        router.replace(`/studies/${studyId}`)
        toast.success("Setup complete! Study is now open for participants.")
      } catch (error) {
        console.error("Failed to open study:", error)
        toast.error("Setup complete, but failed to open study automatically.")
      }
    }

    await refetchNotifications()
    router.replace(`/studies/${studyId}`)
  }

  // Show warning if no pilot data found
  if (!enrichedResult) {
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
            {missingKeys.length > 0 && (
              <div>
                <div className="font-semibold">Missing keys</div>
                <div className="text-sm">{missingKeys.join(", ")}</div>
              </div>
            )}
            {extraKeys.length > 0 && (
              <div>
                <div className="font-semibold">Additional keys</div>
                <div className="text-sm">{extraKeys.join(", ")}</div>
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
        allPilotResults={allPilotResults}
        variables={variables}
        extractionBundle={extractionBundle}
        onTemplateSaved={() => {
          // Refresh to get updated study data (step6Completed will be updated)
          router.refresh()
        }}
        onValidationChange={setIsTemplateValid}
        hiddenVariables={hiddenVariables}
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
