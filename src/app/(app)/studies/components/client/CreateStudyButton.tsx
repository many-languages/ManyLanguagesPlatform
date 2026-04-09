"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import createStudy from "../../mutations/createStudy"
import { AsyncButton } from "@/src/app/components/AsyncButton"

const DEFAULT_CREATE_ERROR_FALLBACK = "Could not create the study. Please try again."

const NAVIGATION_ERROR_MESSAGE =
  "Study created, but opening setup failed. Please open it from My Studies."

/**
 * Maps mutation errors to a short, single-line message safe to show in the UI.
 * Falls back when the error is missing or looks like non-user-facing output.
 */
export function getCreateStudyErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_CREATE_ERROR_FALLBACK
): string {
  if (error instanceof Error) {
    const msg = error.message.trim()
    if (msg.length > 0 && msg.length <= 300 && !/\n/.test(msg)) {
      return msg
    }
  }
  return fallback
}

export default function CreateStudyButton({ className }: { className?: string }) {
  const router = useRouter()
  const [createStudyMutation] = useMutation(createStudy)

  const handleCreate = async () => {
    let studyId: number
    try {
      const study = await createStudyMutation({
        title: "Untitled study",
        description: "",
        startDate: new Date(),
        endDate: new Date(),
        sampleSize: 0,
        payment: "",
        length: "",
      })
      studyId = study.id
    } catch (e: unknown) {
      toast.error(getCreateStudyErrorMessage(e))
      return
    }

    try {
      router.push(`/studies/${studyId}/setup/step1`)
    } catch {
      toast.error(NAVIGATION_ERROR_MESSAGE)
    }
  }

  return (
    <AsyncButton
      onClick={handleCreate}
      loadingText="Creating"
      className={className ?? "btn btn-secondary"}
    >
      Create Study
    </AsyncButton>
  )
}
