"use client"

import { useState, useEffect, useTransition, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useSession } from "@blitzjs/auth"
import { useMutation, useQuery } from "@blitzjs/rpc"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
import updateSetupCompletion from "../../../mutations/updateSetupCompletion"
import { checkPilotStatusAction } from "../../actions/checkPilotStatus"
import getResearcherRunUrl from "../../../queries/getResearcherRunUrl"
import Step3Instructions from "./Step3Instructions"
import Step3Actions from "./Step3Actions"
import StepNavigation from "../../../components/client/StepNavigation"
import { useWindowResumeCheck } from "@/src/app/hooks/useWindowResumeCheck"

export default function Step3Content() {
  const { study } = useStudySetup()
  const { userId } = useSession()
  const router = useRouter()
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const [, startTransition] = useTransition() // React 19
  const latestUpload = study.latestJatosStudyUpload
  const jatosStudyId = latestUpload?.jatosStudyId ?? null
  const jatosBatchId = latestUpload?.jatosBatchId ?? null
  const step3Completed = latestUpload?.step3Completed ?? false

  // Memoize researcher lookup
  const researcher = useMemo(
    () => study.researchers?.find((r) => r.userId === userId) ?? null,
    [study.researchers, userId]
  )
  const researcherId = researcher?.id ?? null
  const [researcherRunUrl] = useQuery(
    getResearcherRunUrl,
    { studyId: study.id },
    { enabled: Boolean(researcherId) }
  )
  const jatosRunUrl = researcherRunUrl?.jatosRunUrl ?? null

  // Pilot completion state - initialize from database to prevent flicker
  const [pilotCompleted, setPilotCompleted] = useState<boolean | null>(step3Completed ?? null)

  // Separate function to update completion
  const updateCompletion = useCallback(async () => {
    try {
      await updateSetupCompletionMutation({
        studyId: study.id,
        step3Completed: true,
      })
      router.refresh()
    } catch (err) {
      console.error("Failed to update step 3 completion:", err)
      throw err
    }
  }, [study.id, updateSetupCompletionMutation, router])

  // Check pilot status using Server Action
  const checkPilotStatus = useCallback(
    async (showToasts = true) => {
      if (!study?.jatosStudyUUID) {
        if (showToasts) {
          toast.error("No JATOS study UUID available")
        }
        return
      }

      const result = await checkPilotStatusAction(study.jatosStudyUUID)

      if (!result.success) {
        startTransition(() => {
          setPilotCompleted(false)
        })
        if (showToasts) {
          toast.error(result.error || "Failed to check pilot status")
        }
        return
      }

      startTransition(() => {
        setPilotCompleted(result.completed)
      })

      if (result.completed) {
        try {
          await updateCompletion()
          if (showToasts) {
            toast.success("Pilot run completed! You can proceed to Step 4.")
          }
        } catch (err) {
          // Already logged in updateCompletion
          if (showToasts) {
            toast.error("Pilot completed but failed to update step completion")
          }
        }
      } else {
        if (showToasts) {
          toast.error("No completed pilot run found. Please complete the survey and try again.")
        }
      }
    },
    [study?.jatosStudyUUID, updateCompletion]
  )

  // Auto-check pilot status on mount when jatosRunUrl is available
  // Only check if not already marked as completed in database (catches edge cases like user forgetting to check before closing browser)
  const hasCheckedOnMount = useRef(false) // Track if we've auto-checked
  const [resumeCheckActive, setResumeCheckActive] = useState(false)
  useEffect(() => {
    if (jatosRunUrl && study?.jatosStudyUUID && !hasCheckedOnMount.current && !step3Completed) {
      hasCheckedOnMount.current = true
      setResumeCheckActive(true)
      checkPilotStatus(false) // Don't show toasts on auto-check
    }
  }, [jatosRunUrl, study?.jatosStudyUUID, step3Completed, checkPilotStatus])

  const handlePilotStatusResume = useCallback(() => checkPilotStatus(false), [checkPilotStatus])

  useWindowResumeCheck({
    enabled: resumeCheckActive && Boolean(jatosRunUrl && study?.jatosStudyUUID && !pilotCompleted),
    onResume: handlePilotStatusResume,
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
        pilotCompleted={pilotCompleted}
        jatosRunUrl={jatosRunUrl}
        researcherId={researcherId!} // Safe: early return above ensures researcherId is non-null
        jatosStudyId={jatosStudyId}
        jatosBatchId={jatosBatchId}
        jatosStudyUUID={study.jatosStudyUUID}
        onCheckStatus={() => checkPilotStatus(true)}
      />

      <StepNavigation
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
