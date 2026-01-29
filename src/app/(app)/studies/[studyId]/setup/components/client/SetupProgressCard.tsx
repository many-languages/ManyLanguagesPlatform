"use client"

import { Route } from "next"
import { useRouter } from "next/navigation"
import Card from "@/src/app/components/Card"
import StepIndicator from "./StepIndicator"
import { Alert } from "@/src/app/components/Alert"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import {
  getNextSetupStepUrl,
  getSetupProgress,
  StudyWithMinimalRelations,
} from "../../utils/setupStatus"

interface SetupProgressCardProps {
  study: StudyWithMinimalRelations
}

export default function SetupProgressCard({ study }: SetupProgressCardProps) {
  const router = useRouter()
  const progress = getSetupProgress(study)
  const { completedStepsList, incompleteStep, isComplete } = progress
  const latestUpload = study.latestJatosStudyUpload
  const step3Completed = latestUpload?.step3Completed ?? false
  const step4Completed = latestUpload?.step4Completed ?? false
  const step5Completed = latestUpload?.step5Completed ?? false

  // Check if Step 6 needs revision (has template but Step 3, Step 4, or Step 5 is incomplete)
  // This happens when JATOS study is updated after feedback template was created
  const hasFeedbackTemplate = Boolean(study.FeedbackTemplate)
  const step6NeedsRevision =
    hasFeedbackTemplate && (!step3Completed || !step4Completed || !step5Completed)

  const handleStepClick = (stepId: number) => {
    // Only completed steps are clickable, so we always navigate with edit mode
    router.push(`/studies/${study.id}/setup/step${stepId}?edit=true&returnTo=study` as Route)
  }

  return (
    <Card title="Setup Progress" collapsible={isComplete} className="mt-4">
      <StepIndicator
        completedSteps={completedStepsList}
        onClickStep={handleStepClick}
        editable={true}
      />
      {step6NeedsRevision && (
        <Alert variant="info" className="mt-4">
          <p className="mb-2">
            Your feedback template needs to be reviewed after the JATOS study was updated. Please
            complete Step 3, Step 4, and Step 5 first, then revise your feedback template.
          </p>
        </Alert>
      )}
      {!isComplete && !step6NeedsRevision && (
        <Alert variant="warning" className="mt-4">
          <p className="mb-2">Complete all steps to open your study for participants.</p>
          {incompleteStep && (
            <NavigationButton
              className="btn btn-sm btn-primary"
              href={getNextSetupStepUrl(study.id, study) as Route}
              pendingText="Loading"
            >
              Continue Setup
            </NavigationButton>
          )}
        </Alert>
      )}
    </Card>
  )
}
