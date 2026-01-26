"use server"

import { extractRequiredVariableNames } from "../utils/requiredKeys"
import { buildPreviewContextFromBundle } from "../utils/previewContext"
import { renderTemplateWithContext } from "../utils/previewRenderer"
import { extractVariableBundleForRenderFromResults } from "../../variables/utils/extractVariable"
import { PreviewFeedbackSchema } from "../validations"

export async function previewFeedbackAction(_prevState: any, formData: FormData) {
  try {
    const template = String(formData.get("template") || "")
    const enrichedResultRaw = String(formData.get("enrichedResult") || "{}")
    const parsed = PreviewFeedbackSchema.parse({
      template,
      enrichedResult: JSON.parse(enrichedResultRaw),
    })
    const requiredVariableNames = extractRequiredVariableNames(parsed.template)
    const bundle = extractVariableBundleForRenderFromResults([parsed.enrichedResult])
    const context = buildPreviewContextFromBundle(bundle, requiredVariableNames)
    const rendered = renderTemplateWithContext(parsed.template, context, {
      withinStudyResultId: parsed.enrichedResult.id,
    })
    return { rendered, error: null }
  } catch (e: any) {
    return { rendered: "", error: e?.message || "Failed to render" }
  }
}
