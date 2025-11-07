"use server"

import { renderTemplate } from "../utils/feedbackRenderer"
import { PreviewFeedbackSchema } from "../validations"

export async function previewFeedbackAction(_prevState: any, formData: FormData) {
  try {
    const template = String(formData.get("template") || "")
    const enrichedResultRaw = String(formData.get("enrichedResult") || "{}")
    const parsed = PreviewFeedbackSchema.parse({
      template,
      enrichedResult: JSON.parse(enrichedResultRaw),
    })
    const rendered = renderTemplate(parsed.template, { enrichedResult: parsed.enrichedResult })
    return { rendered, error: null }
  } catch (e: any) {
    return { rendered: "", error: e?.message || "Failed to render" }
  }
}
