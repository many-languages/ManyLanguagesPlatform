"use server"

import type { FeedbackTemplate, FeedbackTemplateEditorInitial } from "@/src/features/feedback/types"
import { mapFeedbackTemplateSaveErrorToUserMessage } from "@/src/features/feedback/domain/mapFeedbackTemplateSaveErrorToUserMessage"
import { saveFeedbackTemplateAndNotify } from "@/src/features/feedback/server/saveFeedbackTemplateAndNotify"

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
  const { content } = input

  if (!content.trim()) {
    return {
      ok: false,
      userMessage: "Please enter some content for your feedback template.",
    }
  }

  try {
    const { template, setupComplete } = await saveFeedbackTemplateAndNotify(input)
    return { ok: true, template, setupComplete }
  } catch (error) {
    console.error("saveFeedbackTemplateAction:", error)
    return { ok: false, userMessage: mapFeedbackTemplateSaveErrorToUserMessage(error) }
  }
}
