"use client"

import { useMemo } from "react"
import MDEditor from "@uiw/react-md-editor"
import Card from "@/src/app/components/Card"
import { renderTemplate } from "../../setup/step4/utils/feedbackRenderer"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"

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
}

export default function FeedbackCard({
  studyId,
  enrichedResult,
  template,
  title = "Feedback",
  className,
}: FeedbackCardProps) {
  const renderedContent = useMemo(() => {
    if (!template?.content) {
      return "No feedback template available for this study."
    }

    if (!enrichedResult) {
      return "No results available to render feedback."
    }

    try {
      return renderTemplate(template.content, { enrichedResult })
    } catch (e) {
      console.error("Error rendering feedback template:", e)
      return "Error rendering feedback. Please contact the researcher."
    }
  }, [template?.content, enrichedResult])

  return (
    <Card title={title} className={className}>
      <div data-color-mode="light">
        <MDEditor.Markdown source={renderedContent} />
      </div>
    </Card>
  )
}
