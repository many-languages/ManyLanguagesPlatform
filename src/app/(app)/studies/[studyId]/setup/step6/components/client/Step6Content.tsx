"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
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

interface Step6ContentProps {
  initialFeedbackTemplate?: {
    id: number
    content: string
    createdAt: Date
    updatedAt: Date
  } | null
  enrichedResult: EnrichedJatosStudyResult | null
  allPilotResults: EnrichedJatosStudyResult[]
  pilotResultId: number | null
  variables: FeedbackVariable[]
}

export default function Step6Content({
  initialFeedbackTemplate = null,
  enrichedResult,
  allPilotResults,
  pilotResultId,
  variables,
}: Step6ContentProps) {
  const router = useRouter()
  const { study, studyId } = useStudySetup()
  const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)
  const [updateStudyStatusMutation] = useMutation(updateStudyStatus)
  const { refetch: refetchNotifications } = useNotificationMenuContext()
  const [runExtractionMutation] = useMutation(runExtraction)
  const [extractionBundle, setExtractionBundle] = useState<SerializedExtractionBundle | null>(null)

  const [cachedBundleResult] = useQuery(
    getCachedExtractionBundle,
    pilotResultId
      ? { studyId, testResultId: pilotResultId, includeDiagnostics: false }
      : { studyId, testResultId: 0, includeDiagnostics: false },
    { enabled: Boolean(pilotResultId) }
  )

  useEffect(() => {
    if (!pilotResultId) return
    if (cachedBundleResult?.bundle) {
      setExtractionBundle(cachedBundleResult.bundle)
      return
    }
    runExtractionMutation({
      studyId,
      testResultId: pilotResultId,
      includeDiagnostics: false,
    })
      .then((result) => setExtractionBundle(result.bundle))
      .catch((error) => {
        console.error("Failed to run extraction for preview:", error)
      })
  }, [cachedBundleResult, pilotResultId, runExtractionMutation, studyId])

  const handleFinish = async () => {
    let templateSavedDuringFinish = false

    if (feedbackEditorRef.current) {
      const isSaved = feedbackEditorRef.current.isTemplateSaved()
      if (!isSaved) {
        // Auto-save template before finishing
        await feedbackEditorRef.current.saveTemplate()
        templateSavedDuringFinish = true
      }
    }

    const canAutoOpen =
      !!study &&
      study.step1Completed &&
      study.step2Completed &&
      study.step3Completed &&
      study.step4Completed &&
      study.step5Completed &&
      (study.step6Completed || templateSavedDuringFinish || !!initialFeedbackTemplate)

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
      />
      <StepNavigation
        prev="step5"
        next="study"
        nextLabel="Finish Setup"
        onNext={handleFinish}
        disableNext={false} // Always enabled since we auto-save
      />
    </>
  )
}
