"use client"

import { useMemo } from "react"
import { renderTemplate } from "../utils/feedbackRenderer"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

export interface UseTemplatePreviewOptions {
  template: string
  enrichedResult: EnrichedJatosStudyResult
  allEnrichedResults?: EnrichedJatosStudyResult[]
}

export function useTemplatePreview(options: UseTemplatePreviewOptions) {
  const { template, enrichedResult, allEnrichedResults } = options

  const rendered = useMemo(() => {
    try {
      return renderTemplate(template, {
        enrichedResult,
        allEnrichedResults,
      })
    } catch (e) {
      console.error("Preview render error:", e)
      return template // fallback to raw markdown
    }
  }, [template, enrichedResult, allEnrichedResults])

  return rendered
}
