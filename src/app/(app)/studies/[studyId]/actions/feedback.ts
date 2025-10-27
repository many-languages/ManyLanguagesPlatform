"use server"

import { z } from "zod"
import { renderTemplate } from "@/src/app/(app)/studies/utils/feedbackRenderer"

const PreviewSchema = z.object({
  template: z.string().min(1),
  enrichedResult: z.any(),
})

export async function previewFeedbackAction(prevState: any, formData: FormData) {
  try {
    const template = String(formData.get("template") || "")
    const enrichedResultRaw = String(formData.get("enrichedResult") || "{}")
    const parsed = PreviewSchema.parse({ template, enrichedResult: JSON.parse(enrichedResultRaw) })
    const rendered = renderTemplate(parsed.template, { enrichedResult: parsed.enrichedResult })
    return { rendered, error: null }
  } catch (e: any) {
    return { rendered: "", error: e?.message || "Failed to render" }
  }
}
