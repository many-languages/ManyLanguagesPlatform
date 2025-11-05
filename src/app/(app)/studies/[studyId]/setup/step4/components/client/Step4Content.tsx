"use client"

import { useRouter } from "next/navigation"
import { useRef } from "react"
import { useQuery } from "@blitzjs/rpc"
import { useStudySetup } from "../../../components/StudySetupProvider"
import FeedbackFormEditor, { FeedbackFormEditorRef } from "./FeedbackFormEditor"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"
import { isSetupComplete } from "../../../utils/setupStatus"
import updateStudyStatus from "@/src/app/(app)/studies/mutations/updateStudyStatus"
import StepNavigation from "../../../components/StepNavigation"
import { Alert } from "@/src/app/components/Alert"
import SaveExitButton from "../../../components/SaveExitButton"
import getStudyDataByComment from "@/src/app/(app)/studies/queries/getStudyDataByComment"

interface Step4ContentProps {
  initialFeedbackTemplate?: {
    id: number
    content: string
    createdAt: Date
    updatedAt: Date
  } | null
}

export default function Step4Content({ initialFeedbackTemplate = null }: Step4ContentProps) {
  const router = useRouter()
  const { study, studyId } = useStudySetup()
  const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)
  const [updateStudyStatusMutation] = useMutation(updateStudyStatus)

  // Fetch enriched result client-side (complex processing, interactive editor)
  const [dataResult] = useQuery(getStudyDataByComment, { studyId, comment: "test" })

  const enrichedResult = dataResult?.enrichedResult ?? null

  const handleFinish = async () => {
    if (feedbackEditorRef.current) {
      const isSaved = feedbackEditorRef.current.isTemplateSaved()
      if (!isSaved) {
        // Auto-save template before finishing
        await feedbackEditorRef.current.saveTemplate()
      }
    }

    // Check if setup is now complete and auto-open study
    if (study && isSetupComplete(study)) {
      try {
        await updateStudyStatusMutation({ studyId, status: "OPEN" })
        router.refresh() // Refresh to get updated study data
        toast.success("Setup complete! Study is now open for participants.")
      } catch (error) {
        console.error("Failed to open study:", error)
        toast.error("Setup complete, but failed to open study automatically.")
      }
    }

    router.push(`/studies/${studyId}`)
  }

  // Show warning if no test run data found
  if (!enrichedResult) {
    return (
      <>
        <SaveExitButton />
        <Alert variant="warning">No test run data found.</Alert>
      </>
    )
  }

  return (
    <>
      <SaveExitButton />

      <FeedbackFormEditor
        ref={feedbackEditorRef}
        enrichedResult={enrichedResult}
        initialTemplate={initialFeedbackTemplate}
        studyId={studyId}
        onTemplateSaved={() => {
          // Refresh to get updated study data (step4Completed will be updated)
          router.refresh()
        }}
      />
      <StepNavigation
        prev="step3"
        next="study"
        nextLabel="Finish Setup"
        onNext={handleFinish}
        disableNext={false} // Always enabled since we auto-save
      />
    </>
  )
}
