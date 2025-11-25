"use client"

import { useMemo } from "react"
import type React from "react"
import clsx from "clsx"
import MDEditor from "@uiw/react-md-editor"
import Card from "@/src/app/components/Card"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { EmptyState } from "@/src/app/components/EmptyState"
import RefreshFeedbackButton from "./RefreshFeedbackButton"
import { renderTemplate } from "../../utils/feedbackRenderer"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"

interface FeedbackCardProps {
  studyId: number
  enrichedResult: EnrichedJatosStudyResult | null | undefined
  template:
    | {
        content: string
      }
    | null
    | undefined
  title?: string
  className?: string
  allEnrichedResults?: EnrichedJatosStudyResult[]
  onRefresh?: () => Promise<void> | void
  showEditButton?: boolean
}

export default function FeedbackCard({
  studyId,
  enrichedResult,
  template,
  title = "Feedback",
  className,
  allEnrichedResults,
  onRefresh,
  showEditButton = false,
}: FeedbackCardProps) {
  const renderedContent = useMemo(() => {
    if (!template?.content) {
      return "No feedback template available for this study."
    }

    if (!enrichedResult) {
      return "No results available to render feedback."
    }

    try {
      return renderTemplate(template.content, {
        enrichedResult,
        allEnrichedResults, // For "across" scope statistics
      })
    } catch (e) {
      console.error("Error rendering feedback template:", e)
      return "Error rendering feedback. Please contact the researcher."
    }
  }, [template?.content, enrichedResult, allEnrichedResults])

  // Build actions: refresh button (if onRefresh provided) + edit button (if showEditButton)
  const hasActions = onRefresh || showEditButton
  const actions = hasActions ? (
    <div className="flex gap-2">
      {onRefresh && <RefreshFeedbackButton onRefresh={onRefresh} />}
      {showEditButton && (
        <NavigationButton
          href={`/studies/${studyId}/setup/step5`}
          className="btn-primary"
          pendingText="Opening"
        >
          Edit
        </NavigationButton>
      )}
    </div>
  ) : undefined

  return (
    <Card title={title} className={clsx("mt-4", className)} collapsible actions={actions}>
      {!enrichedResult ? (
        <EmptyState
          message="Complete the study to see your personalized feedback here."
          title="No Feedback Yet"
        />
      ) : (
        <div data-color-mode="light" className={mdEditorClassName.preview}>
          <MDEditor.Markdown source={renderedContent} style={mdEditorStyles.preview} />
        </div>
      )}
    </Card>
  )
}
