"use client"

import type React from "react"
import clsx from "clsx"
import MDEditor from "@uiw/react-md-editor"
import Card from "@/src/app/components/Card"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { EmptyState } from "@/src/app/components/EmptyState"
import RefreshFeedbackButton from "./RefreshFeedbackButton"
import type { FeedbackCardProps, FeedbackCardTone } from "../../types"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"
import { studySetupStepPath } from "../../../setup/utils/setupRoutes"
import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "@/src/lib/studies/studyEditability"

const TONE_BG: Record<FeedbackCardTone, string> = {
  default: "bg-base-200",
  info: "bg-info/10",
  warning: "bg-warning/10",
  error: "bg-error/10",
}

const TONE_BORDER: Record<FeedbackCardTone, string> = {
  default: "border-base-300",
  info: "border-info/20",
  warning: "border-warning/20",
  error: "border-error/20",
}

export default function FeedbackCard({
  studyId,
  renderedMarkdown,
  feedbackMessage,
  feedbackTone,
  title = "Feedback",
  className,
  participantCompleted = true,
  researcherHasPilotData = true,
  onRefresh,
  showEditButton = false,
  canEditStudySetup = true,
  participantMatchingResponseCount = 0,
  participantSelectedResponseEndDate = null,
}: FeedbackCardProps) {
  const resolvedTone: FeedbackCardTone =
    feedbackMessage !== undefined ? feedbackTone ?? "info" : "default"
  const cardBg = TONE_BG[resolvedTone]
  const cardBorder = TONE_BORDER[resolvedTone]
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
        <span
          className={!canEditStudySetup ? "tooltip tooltip-top inline-block" : "inline-block"}
          data-tip={!canEditStudySetup ? ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE : undefined}
        >
          <NavigationButton
            href={studySetupStepPath(studyId, 6)}
            className={`btn-primary ${!canEditStudySetup ? "btn-disabled" : ""}`}
            pendingText="Opening"
            disabled={!canEditStudySetup}
          >
            Edit
          </NavigationButton>
        </span>
      )}
    </div>
  ) : undefined

  let body: React.ReactNode
  if (feedbackMessage !== undefined) {
    body = (
      <div className="text-sm text-base-content/90 leading-relaxed">
        {typeof feedbackMessage === "string" ? <p>{feedbackMessage}</p> : feedbackMessage}
      </div>
    )
  } else if (participantCompleted === false) {
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
    <Card
      title={title}
      className={clsx("mt-4", className)}
      collapsible
      actions={actions}
      bgColor={cardBg}
      borderColorClass={cardBorder}
    >
      {participantMatchingResponseCount > 1 ? (
        <div className="mb-3 rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-base-content/80">
          Multiple responses were found. Showing the latest response
          {latestResponseLabel ? ` (submitted ${latestResponseLabel}).` : "."}
        </div>
      ) : null}
      {body}
    </Card>
  )
}
