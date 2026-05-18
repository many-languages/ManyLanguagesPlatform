"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { renderFeedbackPreviewAction } from "../actions/renderFeedbackPreviewAction"

interface UseTemplatePreviewOptions {
  debouncedMarkdown: string
  studyId: number
  feedbackPreviewContextKey: string
  withinStudyResultId?: number
  initialMarkdown: string
}

interface UseTemplatePreviewResult {
  previewMarkdown: string
  previewError: string | null
}

/**
 * Drives the live preview panel in `FeedbackFormEditor`.
 *
 * Calls `renderFeedbackPreviewAction` whenever `debouncedMarkdown` (or any
 * other input) changes. A monotonic sequence counter discards responses that
 * arrive out-of-order so the panel never shows a stale render.
 */
export function useTemplatePreview({
  debouncedMarkdown,
  studyId,
  feedbackPreviewContextKey,
  withinStudyResultId,
  initialMarkdown,
}: UseTemplatePreviewOptions): UseTemplatePreviewResult {
  const [previewMarkdown, setPreviewMarkdown] = useState(initialMarkdown)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    const seq = ++seqRef.current

    void renderFeedbackPreviewAction({
      studyId,
      contextKey: feedbackPreviewContextKey,
      templateContent: debouncedMarkdown,
      withinStudyResultId,
    })
      .then((result) => {
        if (seq !== seqRef.current) return
        if (result.ok) {
          setPreviewMarkdown(result.markdown)
          setPreviewError(null)
        } else {
          setPreviewError(result.error)
          toast.error(result.error)
        }
      })
      .catch((err: unknown) => {
        if (seq !== seqRef.current) return
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : "Preview failed."
        setPreviewError(message)
        toast.error(message)
      })
  }, [debouncedMarkdown, studyId, feedbackPreviewContextKey, withinStudyResultId])

  return { previewMarkdown, previewError }
}
