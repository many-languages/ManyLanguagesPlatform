"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import {
  default as CodebookContent,
  type CodebookContentRef,
  type CodebookContentProps,
  type CodebookStepState,
} from "@/src/features/codebook/ui/CodebookContent"
import StepNavigation from "../StepNavigation"
import { studySetupStepPath } from "../../../../domain/setup/setupRoutes"

export default function Step5Content(props: CodebookContentProps) {
  const router = useRouter()
  const codebookRef = useRef<CodebookContentRef>(null)
  const [stepState, setStepState] = useState<CodebookStepState>({ disableNext: true })

  const handleNext = async () => {
    const success = await codebookRef.current?.saveCodebook()
    if (!success) return
    router.push(studySetupStepPath(props.study.id, 6) as Route)
  }

  return (
    <>
      <CodebookContent ref={codebookRef} {...props} onStepStateChange={setStepState} />
      <StepNavigation
        studyId={props.study.id}
        prev="step4"
        next="step6"
        onNext={handleNext}
        disableNext={stepState.disableNext}
        nextTooltip={stepState.nextTooltip}
      />
    </>
  )
}
