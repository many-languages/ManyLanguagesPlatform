"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"

import updateSetupCompletion from "@/src/features/studies/mutations/updateSetupCompletion"
import { checkPilotStatusAction } from "@/src/features/studies/actions/checkPilotStatus"
import { useWindowResumeCheck } from "@/src/lib/utils/useWindowResumeCheck"

interface UsePilotStatusCheckParams {
  studyId: number
  jatosStudyUUID: string | null
  jatosStudyUploadId: number | null
  jatosRunUrl: string | null
  step3Completed: boolean
}

interface UsePilotStatusCheckResult {
  pilotCompleted: boolean
  checkPilotStatus: (showToasts?: boolean) => Promise<void>
}

export function usePilotStatusCheck({
  studyId,
  jatosStudyUUID,
  jatosStudyUploadId,
  jatosRunUrl,
  step3Completed,
}: UsePilotStatusCheckParams): UsePilotStatusCheckResult {
  const router = useRouter()
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const [, startTransition] = useTransition()
  const [pilotCompleted, setPilotCompleted] = useState<boolean>(step3Completed)

  const updateCompletion = useCallback(async () => {
    try {
      await updateSetupCompletionMutation({ studyId, step3Completed: true })
      router.refresh()
    } catch (err) {
      console.error("Failed to update step 3 completion:", err)
      throw err
    }
  }, [studyId, updateSetupCompletionMutation, router])

  const checkPilotStatus = useCallback(
    async (showToasts = true) => {
      if (!jatosStudyUUID) {
        if (showToasts) {
          toast.error("No JATOS study UUID available")
        }
        return
      }

      const result = await checkPilotStatusAction({
        studyId,
        jatosStudyUUID,
        jatosStudyUploadId,
      })

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
        setPilotCompleted(result.completed ?? false)
      })

      if (result.completed) {
        try {
          await updateCompletion()
          if (showToasts) {
            toast.success("Pilot run completed! You can proceed to Step 4.")
          }
        } catch {
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
    [jatosStudyUUID, jatosStudyUploadId, studyId, updateCompletion, startTransition]
  )

  // Auto-check on mount when the run URL is available and step not yet completed.
  // Catches the edge case where the user completed the pilot but closed the browser before verifying.
  const hasCheckedOnMount = useRef(false)
  const [resumeCheckActive, setResumeCheckActive] = useState(false)
  useEffect(() => {
    if (jatosRunUrl && jatosStudyUUID && !hasCheckedOnMount.current && !step3Completed) {
      hasCheckedOnMount.current = true
      setResumeCheckActive(true)
      checkPilotStatus(false)
    }
  }, [jatosRunUrl, jatosStudyUUID, step3Completed, checkPilotStatus])

  const handleResumeCheck = useCallback(() => checkPilotStatus(false), [checkPilotStatus])

  useWindowResumeCheck({
    enabled: resumeCheckActive && Boolean(jatosRunUrl && jatosStudyUUID && !pilotCompleted),
    onResume: handleResumeCheck,
  })

  return { pilotCompleted, checkPilotStatus }
}
