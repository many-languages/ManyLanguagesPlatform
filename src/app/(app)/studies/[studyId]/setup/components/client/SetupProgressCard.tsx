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

  // Check if Step 4 needs revision (has template but Step 3 is incomplete)
  // This happens when JATOS study is updated after feedback template was created
  const hasFeedbackTemplate = (study.FeedbackTemplate?.length ?? 0) > 0
  const step4NeedsRevision = hasFeedbackTemplate && !study.step3Completed

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
      {step4NeedsRevision && (
        <Alert variant="info" className="mt-4">
          <p className="mb-2">
            Your feedback template needs to be reviewed after the JATOS study was updated. Please
            complete Step 3 first, then revise your feedback template.
          </p>
        </Alert>
      )}
      {!isComplete && !step4NeedsRevision && (
        <Alert variant="warning" className="mt-4">
          <p className="mb-2">Complete all steps to open your study for participants.</p>
          {incompleteStep && (
            <NavigationButton
              className="btn btn-sm btn-primary"
              href={getNextSetupStepUrl(study.id, study) as Route}
              pendingText="Loading..."
            >
              Continue Setup
            </NavigationButton>
          )}
        </Alert>
      )}
    </Card>
  )
}
