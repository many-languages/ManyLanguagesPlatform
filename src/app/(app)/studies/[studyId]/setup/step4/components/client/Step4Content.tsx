"use client"

import { useRouter } from "next/navigation"
import { useRef } from "react"
import FeedbackFormEditor, { FeedbackFormEditorRef } from "./FeedbackFormEditor"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"
import { isSetupComplete } from "../../../utils/setupStatus"
import { StudyWithRelations } from "../../../../../queries/getStudy"
import updateStudyStatus from "@/src/app/(app)/studies/mutations/updateStudyStatus"
import StepNavigation from "../../../components/StepNavigation"

interface Step4ContentProps {
  study: StudyWithRelations
  studyId: number
  enrichedResult: any
  feedbackTemplate: any
}

export default function Step4Content({
  study,
  studyId,
  enrichedResult,
  feedbackTemplate,
}: Step4ContentProps) {
  const router = useRouter()
  const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)
  const [updateStudyStatusMutation] = useMutation(updateStudyStatus)

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
        toast.success("Setup complete! Study is now open for participants.")
      } catch (error) {
        console.error("Failed to open study:", error)
        toast.error("Setup complete, but failed to open study automatically.")
      }
    }

    router.push(`/studies/${studyId}`)
  }

  return (
    <>
      {/* Save & Exit button */}
      <div className="mb-4">
        <button className="btn btn-ghost" onClick={() => router.push(`/studies/${studyId}`)}>
          ← Save & Exit Setup
        </button>
      </div>

      <FeedbackFormEditor
        ref={feedbackEditorRef}
        enrichedResult={enrichedResult}
        initialTemplate={feedbackTemplate}
        studyId={studyId}
        onTemplateSaved={() => {
          // Refetch template data to update the navigation state
          window.location.reload()
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
