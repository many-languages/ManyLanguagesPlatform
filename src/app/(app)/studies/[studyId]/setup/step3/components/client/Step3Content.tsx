"use client"

import {
  useState,
  useEffect,
  useTransition,
  useRef,
  useCallback,
  useMemo,
  useActionState,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useSession } from "@blitzjs/auth"
import { useMutation } from "@blitzjs/rpc"
import { useStudySetup } from "../../../components/client/StudySetupProvider"
import updateSetupCompletion from "../../../mutations/updateSetupCompletion"
import { checkPilotStatusAction } from "../../actions/checkPilotStatus"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
import RunStudyButton from "./RunStudyButton"
import GenerateTestLinkButton from "./GenerateTestLinkButton"
import Step3Instructions from "./Step3Instructions"
import { Alert } from "@/src/app/components/Alert"
import StepNavigation from "../../../components/client/StepNavigation"

export default function Step3Content() {
  const { study } = useStudySetup()
  const { userId } = useSession()
  const router = useRouter()
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const [, startTransition] = useTransition() // React 19

  // Memoize researcher lookup
  const researcher = useMemo(
    () => study.researchers?.find((r) => r.userId === userId) ?? null,
    [study.researchers, userId]
  )
  const researcherId = researcher?.id ?? null
  const jatosRunUrl = researcher?.jatosRunUrl ?? null

  // Pilot completion state - initialize from database to prevent flicker
  const [pilotCompleted, setPilotCompleted] = useState<boolean | null>(study.step3Completed ?? null)
  const hasCheckedOnMount = useRef(false) // Track if we've auto-checked

  const handleGenerated = () => {
    router.refresh()
  }

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
      if (!study?.jatosStudyUUID) return

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
            toast.success("Pilot study completed! You can proceed to Step 4.")
          }
        } catch (err) {
          // Already logged in updateCompletion
          if (showToasts) {
            toast.error("Pilot completed but failed to update step completion")
          }
        }
      } else {
        if (showToasts) {
          toast.error("No completed pilot study found. Please complete the survey and try again.")
        }
      }
    },
    [study?.jatosStudyUUID, updateCompletion]
  )

  // React 19: useActionState for manual check button
  const [checkState, checkAction, isPendingCheck] = useActionState(
    async (prevState: any, formData: FormData) => {
      const jatosStudyUUID = formData.get("jatosStudyUUID") as string
      if (!jatosStudyUUID) {
        return { error: "No JATOS study UUID" }
      }

      await checkPilotStatus(true)
      return { success: true }
    },
    null
  )

  // Auto-check pilot status on mount when jatosRunUrl is available
  useEffect(() => {
    if (jatosRunUrl && study?.jatosStudyUUID && !hasCheckedOnMount.current) {
      hasCheckedOnMount.current = true
      checkPilotStatus(false) // Don't show toasts on auto-check
    }
  }, [jatosRunUrl, study?.jatosStudyUUID, checkPilotStatus])

  if (!researcherId) {
    return <p className="text-error">You are not assigned as a researcher to this study.</p>
  }

  return (
    <>
      <Step3Instructions
        pilotCompleted={pilotCompleted}
        jatosRunUrl={jatosRunUrl}
        hasJatosSetup={!!(study.jatosStudyId && study.jatosBatchId)}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {!study.jatosStudyId || !study.jatosBatchId ? (
          <Alert variant="warning">
            <p>Please complete Step 2 (JATOS setup) first.</p>
          </Alert>
        ) : !jatosRunUrl ? (
          /* Generate Test Link button when no link exists */
          <div className="flex justify-center">
            <GenerateTestLinkButton
              studyResearcherId={researcherId}
              jatosStudyId={study.jatosStudyId}
              jatosBatchId={study.jatosBatchId}
              onGenerated={handleGenerated}
              label="Generate Test Link"
              className="btn btn-primary btn-lg"
            />
          </div>
        ) : (
          /* Actions Section - Generate Test Link (if completed), Run Study and Check Status */
          <div className="flex justify-center items-center gap-0">
            {pilotCompleted === true && study.jatosStudyId && study.jatosBatchId && (
              <>
                <GenerateTestLinkButton
                  studyResearcherId={researcherId}
                  jatosStudyId={study.jatosStudyId}
                  jatosBatchId={study.jatosBatchId}
                  onGenerated={handleGenerated}
                  label="Generate Test Link"
                  className="btn btn-accent btn-lg"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </GenerateTestLinkButton>
                <div className="divider divider-horizontal"></div>
              </>
            )}
            <RunStudyButton runUrl={jatosRunUrl} />
            <div className="divider divider-horizontal"></div>
            <form action={checkAction}>
              <input type="hidden" name="jatosStudyUUID" value={study.jatosStudyUUID || ""} />
              <button
                type="submit"
                className={`btn btn-secondary btn-lg ${isPendingCheck ? "loading" : ""}`}
                disabled={isPendingCheck || !study.jatosStudyUUID}
              >
                {isPendingCheck ? "Checking..." : "Check Pilot Status"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Display errors from useActionState if any */}
      {checkState?.error && (
        <Alert variant="error" className="mt-6">
          <p>{checkState.error}</p>
        </Alert>
      )}

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
