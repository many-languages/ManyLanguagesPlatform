"use client"

import { useMemo } from "react"
import type React from "react"
import clsx from "clsx"
import MDEditor from "@uiw/react-md-editor"
import Card from "@/src/app/components/Card"
import { NavigationButton } from "@/src/app/components/NavigationButton"
import { EmptyState } from "@/src/app/components/EmptyState"
import RefreshFeedbackButton from "./RefreshFeedbackButton"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { extractVariableBundleForRenderFromResults } from "../../../variables/utils/extractVariable"
import { buildPreviewContextFromBundle } from "../../utils/previewContext"
import { renderTemplateWithContext } from "../../utils/previewRenderer"
import { extractRequiredVariableNames } from "../../utils/requiredKeys"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"

interface FeedbackCardProps {
  studyId: number
  enrichedResult: EnrichedJatosStudyResult | null | undefined
  template:
    | {
        content: string
        requiredVariableKeys?: string[] | null
      }
    | null
    | undefined
  title?: string
  className?: string
  allEnrichedResults?: EnrichedJatosStudyResult[]
  requiredVariableKeyList?: string[]
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
  requiredVariableKeyList,
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
      const requiredVariableNames =
        Array.isArray(template.requiredVariableKeys) && template.requiredVariableKeys.length > 0
          ? template.requiredVariableKeys
          : extractRequiredVariableNames(template.content)

      const usesAcross = /\bstat:[^}]*:across\b/.test(template.content)
      const resultsForExtraction =
        usesAcross && allEnrichedResults && allEnrichedResults.length > 0
          ? allEnrichedResults
          : [enrichedResult]

      const allowlist =
        requiredVariableKeyList && requiredVariableKeyList.length > 0
          ? new Set(requiredVariableKeyList)
          : undefined

      const bundle = extractVariableBundleForRenderFromResults(resultsForExtraction, allowlist)
      const context = buildPreviewContextFromBundle(bundle, requiredVariableNames)

      return renderTemplateWithContext(template.content, context, {
        withinStudyResultId: enrichedResult.id,
      })
    } catch (e) {
      console.error("Error rendering feedback template:", e)
      return "Error rendering feedback. Please contact the researcher."
    }
  }, [
    template?.content,
    template?.requiredVariableKeys,
    enrichedResult,
    allEnrichedResults,
    requiredVariableKeyList,
  ])

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
