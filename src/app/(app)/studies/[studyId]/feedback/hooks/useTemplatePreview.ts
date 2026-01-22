"use client"

import { useMemo } from "react"
import { renderTemplateWithContext } from "../utils/previewRenderer"
import type { PreviewRenderContext } from "../utils/previewContext"

export interface UseTemplatePreviewOptions {
  template: string
  context: PreviewRenderContext | null
}

export function useTemplatePreview(options: UseTemplatePreviewOptions) {
  const { template, context } = options

  const rendered = useMemo(() => {
    try {
      if (!context) return template
      return renderTemplateWithContext(template, context)
    } catch (e) {
      console.error("Preview render error:", e)
      return template // fallback to raw markdown
    }
  }, [template, context])

  return rendered
}
