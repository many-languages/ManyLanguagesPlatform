"use client"

import type React from "react"
import clsx from "clsx"
import MDEditor from "@uiw/react-md-editor"
import Card from "@/src/app/components/Card"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { EmptyState } from "@/src/app/components/EmptyState"
import RefreshFeedbackButton from "./RefreshFeedbackButton"
import type { FeedbackCardProps } from "../../types"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"

export default function FeedbackCard({
  studyId,
  renderedMarkdown,
  title = "Feedback",
  className,
  participantCompleted = true,
  researcherHasPilotData = true,
  onRefresh,
  showEditButton = false,
  participantMatchingResponseCount = 0,
  participantSelectedResponseEndDate = null,
}: FeedbackCardProps) {
  const latestResponseLabel =
    typeof participantSelectedResponseEndDate === "number" &&
    Number.isFinite(participantSelectedResponseEndDate)
      ? new Date(participantSelectedResponseEndDate).toLocaleString()
      : null
  const hasActions = onRefresh || showEditButton
  const actions = hasActions ? (
    <div className="flex gap-2">
      {onRefresh && <RefreshFeedbackButton onRefresh={onRefresh} />}
      {showEditButton && (
        <NavigationButton
          href={`/studies/${studyId}/setup/step6`}
          className="btn-primary"
          pendingText="Opening"
        >
          Edit
        </NavigationButton>
      )}
    </div>
  ) : undefined

  let body: React.ReactNode
  if (participantCompleted === false) {
    body = (
      <EmptyState
        message="Complete the study to see your personalized feedback here."
        title="No Feedback Yet"
      />
    )
  } else if (showEditButton && researcherHasPilotData === false) {
    body = <EmptyState message="No pilot data found." title="No Feedback Preview" />
  } else if (renderedMarkdown !== null && renderedMarkdown !== "") {
    body = (
      <div data-color-mode="light" className={mdEditorClassName.preview}>
        <MDEditor.Markdown source={renderedMarkdown} style={mdEditorStyles.preview} />
      </div>
    )
  } else {
    body = <EmptyState message="No feedback content to display." title="No Feedback" />
  }

  return (
    <Card title={title} className={clsx("mt-4", className)} collapsible actions={actions}>
      {participantMatchingResponseCount > 1 ? (
        <div className="mb-3 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-base-content/80">
          Multiple responses were found for this participant. Showing the latest response
          {latestResponseLabel ? ` (submitted ${latestResponseLabel}).` : "."}
        </div>
      ) : null}
      {body}
    </Card>
  )
}
