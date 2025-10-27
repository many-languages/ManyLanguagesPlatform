"use client"

import { useParams, useRouter } from "next/navigation"
import { useRef } from "react"
import FeedbackFormEditor, { FeedbackFormEditorRef } from "../../components/FeedbackFormEditor"
import { useQuery, useMutation } from "@blitzjs/rpc"
import getStudyDataByComment from "../../../queries/getStudyDataByComment"
import getFeedbackTemplate from "../../../queries/getFeedbackTemplate"
import getStudy from "../../../queries/getStudy"
import updateStudyStatus from "../../../mutations/updateStudyStatus"
import StepNavigation from "../../components/StepNavigation"
import { isSetupComplete } from "../../../utils/setupStatus"
import { toast } from "react-hot-toast"

export default function Step4Page() {
  const router = useRouter()
  const params = useParams()
  const studyId = Number(params.studyId)
  const feedbackEditorRef = useRef<FeedbackFormEditorRef>(null)

  const [data, { isLoading: dataLoading, error: dataError }] = useQuery(getStudyDataByComment, {
    studyId,
    comment: "test",
  })

  const [feedbackTemplate, { isLoading: templateLoading, error: templateError }] = useQuery(
    getFeedbackTemplate,
    { studyId }
  )

  const [study, { isLoading: studyLoading }] = useQuery(getStudy, { id: studyId })
  const [updateStudyStatusMutation] = useMutation(updateStudyStatus)

  if (dataLoading || templateLoading) return <p>Loading...</p>
  if (dataError) return <p className="text-error">Error loading data: {dataError.message}</p>
  if (templateError)
    return <p className="text-error">Error loading template: {templateError.message}</p>

  if (!data?.enrichedResult) {
    return <p className="text-warning">No test run data found.</p>
  }

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
      <h2 className="text-lg font-semibold mb-4">Step 4 – Feedback</h2>

      {/* Save & Exit button */}
      <div className="mb-4">
        <button className="btn btn-ghost" onClick={() => router.push(`/studies/${studyId}`)}>
          ← Save & Exit Setup
        </button>
      </div>

      <FeedbackFormEditor
        ref={feedbackEditorRef}
        enrichedResult={data.enrichedResult}
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
