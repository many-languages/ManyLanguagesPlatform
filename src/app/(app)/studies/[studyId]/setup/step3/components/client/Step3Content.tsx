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
import RunStudyButton from "./RunStudyButton"
import TestLinkDisplay from "./TestLinkDisplay"
import { Alert } from "@/src/app/components/Alert"
import Card from "@/src/app/components/Card"
import StepNavigation from "../../../components/client/StepNavigation"

export default function Step3Content() {
  const { study, studyId } = useStudySetup()
  const { userId } = useSession()
  const router = useRouter()
  const [updateSetupCompletionMutation] = useMutation(updateSetupCompletion)
  const [isPending, startTransition] = useTransition() // React 19

  // Memoize researcher lookup
  const researcher = useMemo(
    () => study.researchers?.find((r) => r.userId === userId) ?? null,
    [study.researchers, userId]
  )
  const researcherId = researcher?.id ?? null
  const jatosRunUrl = researcher?.jatosRunUrl ?? null

  // Pilot completion state
  const [pilotCompleted, setPilotCompleted] = useState<boolean | null>(null)
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
      {/* Instructions - collapsible card, open by default, full width */}
      <Card title="How to test your study?" collapsible bgColor="bg-base-300" className="mb-6">
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click "Run Study" below to open the survey in a new tab</li>
          <li>Complete the entire survey as a test participant</li>
          <li>Click "Check Pilot Status" to verify completion</li>
        </ol>
      </Card>

      <div className="max-w-2xl mx-auto space-y-6">
        {!jatosRunUrl ? (
          <>
            {!study.jatosStudyId || !study.jatosBatchId ? (
              <Alert variant="warning">
                <p>Please complete Step 2 (JATOS setup) first.</p>
              </Alert>
            ) : (
              <Alert variant="info">
                <p>
                  Test link should be automatically generated. If it doesn't appear, please refresh
                  the page or contact support.
                </p>
              </Alert>
            )}
          </>
        ) : (
          <>
            {/* Test Link Section */}
            {study.jatosStudyId && study.jatosBatchId && (
              <TestLinkDisplay
                runUrl={jatosRunUrl}
                studyResearcherId={researcherId}
                jatosStudyId={study.jatosStudyId}
                jatosBatchId={study.jatosBatchId}
                onRegenerated={handleGenerated}
              />
            )}

            {/* Actions Section */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <RunStudyButton runUrl={jatosRunUrl} />
              </div>

              {/* Check pilot status button - using useActionState */}
              <div className="flex justify-center">
                <form action={checkAction}>
                  <input type="hidden" name="jatosStudyUUID" value={study.jatosStudyUUID || ""} />
                  <button
                    type="submit"
                    className={`btn btn-outline ${isPendingCheck ? "loading" : ""}`}
                    disabled={isPendingCheck || !study.jatosStudyUUID}
                  >
                    {isPendingCheck ? "Checking..." : "Check Pilot Status"}
                  </button>
                </form>
              </div>

              {/* Display errors from useActionState if any */}
              {checkState?.error && (
                <Alert variant="error">
                  <p>{checkState.error}</p>
                </Alert>
              )}
            </div>
          </>
        )}
      </div>

      {/* Status messages - full width */}
      {jatosRunUrl && (
        <>
          {pilotCompleted === false && (
            <Alert variant="warning" className="mt-6">
              <p className="font-semibold">Pilot study not completed</p>
              <p className="text-sm mt-1">
                Please complete the pilot study following the instructions above before proceeding
                to Step 4.
              </p>
            </Alert>
          )}

          {pilotCompleted === true && (
            <Alert variant="success" className="mt-6">
              <p className="font-semibold">✓ Pilot study completed!</p>
              <p className="text-sm mt-1">You can proceed to Step 4.</p>
            </Alert>
          )}

          {pilotCompleted === null && (
            <Alert variant="info" className="mt-6">
              <p>After completing the pilot study, click "Check Pilot Status" to verify.</p>
            </Alert>
          )}
        </>
      )}

      <StepNavigation prev="step2" next="step4" disableNext={!jatosRunUrl || !pilotCompleted} />
    </>
  )
}
