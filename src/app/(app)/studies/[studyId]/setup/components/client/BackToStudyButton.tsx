"use client"

import type { Route } from "next"
import { NavigationButton } from "@/src/app/components/NavigationButton"

import { studyPath } from "../../utils/setupRoutes"

/**
 * Navigates to the study overview. Does not submit or persist setup forms.
 */
export default function BackToStudyButton({ studyId }: { studyId: number }) {
  return (
    <NavigationButton
      href={studyPath(studyId) as Route}
      pendingText="Navigating"
      className="btn btn-ghost tooltip tooltip-top"
      data-tip="Your current edits will not be saved when you leave setup."
    >
      ← Back to study
    </NavigationButton>
  )
}
