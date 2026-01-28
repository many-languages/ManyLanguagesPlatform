"use client"

import type { Route } from "next"
import { useStudySetup } from "./StudySetupProvider"
import { NavigationButton } from "@/src/app/components/NavigationButton"

/**
 * SaveExitButton - A button that navigates back to the study page
 * Used in setup step pages to allow users to exit setup and return to the study page
 */
export default function SaveExitButton({ studyId }: { studyId: number }) {
  return (
    <NavigationButton
      href={`/studies/${studyId}` as Route}
      pendingText="Navigating..."
      className="btn btn-ghost"
    >
      ← Save & Exit Setup
    </NavigationButton>
  )
}
