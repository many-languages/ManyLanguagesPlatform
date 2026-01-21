"use client"

import { useRouter } from "next/navigation"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
import { useMutation } from "@blitzjs/rpc"
import updateSetupCompletion from "../../../mutations/updateSetupCompletion"
import StepNavigation from "../../../components/client/StepNavigation"
import DebugContent from "../../../../debug/components/client/DebugContent"
import type { ValidationData } from "../../../../debug/utils/getValidationData"
import { useState } from "react"

interface Step4ContentProps {
  validationData: ValidationData
}

export default function Step4Content({ validationData }: Step4ContentProps) {
  const router = useRouter()
  const { study, studyId } = useStudySetup()
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await updateSetupCompletionMutation({
        studyId: study.id,
        step4Completed: true,
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to update step 4 completion:", err)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <>
      <DebugContent validationData={validationData} />
      <StepNavigation
        prev="step3"
        next="step5"
        disableNext={!study.step4Completed}
        onNext={handleComplete}
        nextLabel={study.step4Completed ? "Continue" : "Mark as Complete"}
      />
    </>
  )
}
