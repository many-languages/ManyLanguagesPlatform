"use server"

import { getSetupCompletionRsc } from "../../setup/queries/getSetupCompletion"
import { STEP_KEYS } from "../../setup/utils/constants"
import { createFeedbackTemplateRsc } from "../mutations/createFeedbackTemplate"
import { updateFeedbackTemplateRsc } from "../mutations/updateFeedbackTemplate"
import type { FeedbackTemplate, FeedbackTemplateEditorInitial } from "../types"
import { extractRequiredVariableNames } from "../utils/requiredKeys"
import { mapFeedbackTemplateSaveErrorToUserMessage } from "../utils/mapFeedbackTemplateSaveErrorToUserMessage"

export interface SaveTemplateInput {
  studyId: number
  content: string
  initialTemplate?: Pick<FeedbackTemplateEditorInitial, "id" | "content"> | null
}

export type SaveFeedbackTemplateActionResult =
  | { ok: true; template: FeedbackTemplate; setupComplete: boolean }
  | { ok: false; userMessage: string }

/**
 * Save or update feedback template and sync variables
 * Orchestrates the business logic for template management
 */
export async function saveFeedbackTemplateAction(
  input: SaveTemplateInput
): Promise<SaveFeedbackTemplateActionResult> {
  const { studyId, content, initialTemplate } = input

  if (!content.trim()) {
    return {
      ok: false,
      userMessage: "Please enter some content for your feedback template.",
    }
  }

  try {
    const requiredVariableNames = extractRequiredVariableNames(content.trim())

    const template = initialTemplate
      ? await updateFeedbackTemplateRsc({
          id: initialTemplate.id,
          content: content.trim(),
          requiredVariableNames,
        })
      : await createFeedbackTemplateRsc({
          studyId,
          content: content.trim(),
          requiredVariableNames,
        })

    const flags = await getSetupCompletionRsc(studyId)
    const setupComplete = STEP_KEYS.every((key) => flags[key] === true)

    return { ok: true, template, setupComplete }
  } catch (error) {
    console.error("saveFeedbackTemplateAction:", error)
    return { ok: false, userMessage: mapFeedbackTemplateSaveErrorToUserMessage(error) }
  }
}
