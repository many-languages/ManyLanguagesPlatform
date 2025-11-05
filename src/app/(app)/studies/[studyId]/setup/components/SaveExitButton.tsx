"use client"

import { useRouter } from "next/navigation"
import { useStudySetup } from "./StudySetupProvider"
import type { Route } from "next"

/**
 * SaveExitButton - A button that navigates back to the study page
 * Used in setup step pages to allow users to exit setup and return to the study page
 */
export default function SaveExitButton() {
  const router = useRouter()
  const { studyId } = useStudySetup()

  return (
    <div className="mb-4">
      <button className="btn btn-ghost" onClick={() => router.push(`/studies/${studyId}` as Route)}>
        ← Save & Exit Setup
      </button>
    </div>
  )
}
