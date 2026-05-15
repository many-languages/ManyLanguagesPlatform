"use client"

import { useMemo, useState } from "react"
import { useSession } from "@blitzjs/auth"

import Step3Instructions from "./Step3Instructions"
import Step3Actions from "./Step3Actions"
import StepNavigation from "../StepNavigation"
import { usePilotStatusCheck } from "./usePilotStatusCheck"

import type { StudyWithRelations } from "../../../../types"

interface Step3ContentProps {
  study: StudyWithRelations
  initialRunUrl: string | null
}

export default function Step3Content({ study, initialRunUrl }: Step3ContentProps) {
  const { userId } = useSession()
  const latestUpload = study.latestJatosStudyUpload
  const jatosStudyUploadId = latestUpload?.id ?? null
  const jatosStudyId = latestUpload?.jatosStudyId ?? null
  const jatosBatchId = latestUpload?.jatosBatchId ?? null
  const step3Completed = latestUpload?.step3Completed ?? false

  const researcher = useMemo(
    () => study.researchers?.find((r) => r.userId === userId) ?? null,
    [study.researchers, userId]
  )
  const researcherId = researcher?.id ?? null

  const [jatosRunUrl, setJatosRunUrl] = useState<string | null>(initialRunUrl)

  const { pilotCompleted, checkPilotStatus } = usePilotStatusCheck({
    studyId: study.id,
    jatosStudyUUID: study.jatosStudyUUID,
    jatosStudyUploadId,
    jatosRunUrl,
    step3Completed,
  })

  if (!researcherId) {
    return <p className="text-error">You are not assigned as a researcher to this study.</p>
  }

  return (
    <>
      <Step3Instructions
        pilotCompleted={pilotCompleted}
        jatosRunUrl={jatosRunUrl}
        hasJatosSetup={!!(jatosStudyId && jatosBatchId)}
      />

      <Step3Actions
        studyId={study.id}
        pilotCompleted={pilotCompleted}
        jatosRunUrl={jatosRunUrl}
        researcherId={researcherId!}
        jatosStudyUploadId={jatosStudyUploadId}
        jatosStudyId={jatosStudyId}
        jatosBatchId={jatosBatchId}
        jatosStudyUUID={study.jatosStudyUUID}
        onPilotLinkGenerated={(runUrl) => {
          setJatosRunUrl(runUrl)
        }}
        onCheckStatus={() => checkPilotStatus(true)}
      />

      <StepNavigation
        studyId={study.id}
        prev="step2"
        next="step4"
        disableNext={!jatosRunUrl || !pilotCompleted}
        nextTooltip={
          !jatosRunUrl
            ? "Please generate a test link first"
            : !pilotCompleted
            ? "Please complete the pilot study and verify completion before proceeding"
            : undefined
        }
      />
    </>
  )
}
