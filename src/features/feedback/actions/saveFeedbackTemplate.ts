"use server"

import type { FeedbackTemplate, FeedbackTemplateEditorInitial } from "@/src/features/feedback/types"
import { mapFeedbackTemplateSaveErrorToUserMessage } from "@/src/features/feedback/domain/mapFeedbackTemplateSaveErrorToUserMessage"
import { saveFeedbackTemplateAndNotify } from "@/src/features/feedback/server/saveFeedbackTemplateAndNotify"
import { SaveFeedbackTemplateActionSchema } from "../validations"

export interface SaveTemplateInput {
  studyId: number
  content: string
  initialTemplate?: Pick<FeedbackTemplateEditorInitial, "id" | "content"> | null
}

export type SaveFeedbackTemplateActionResult =
  | { ok: true; template: FeedbackTemplate; setupComplete: boolean }
  | { ok: false; userMessage: string }

export async function saveFeedbackTemplateAction(
  input: SaveTemplateInput
): Promise<SaveFeedbackTemplateActionResult> {
  const parsed = SaveFeedbackTemplateActionSchema.safeParse(input)
  if (!parsed.success) {
    const userMessage = parsed.error.errors[0]?.message ?? "Invalid feedback template input."
    return { ok: false, userMessage }
  }

  try {
    const { template, setupComplete } = await saveFeedbackTemplateAndNotify(parsed.data)
    return { ok: true, template, setupComplete }
  } catch (error) {
    console.error("saveFeedbackTemplateAction:", error)
    return { ok: false, userMessage: mapFeedbackTemplateSaveErrorToUserMessage(error) }
  }
}
