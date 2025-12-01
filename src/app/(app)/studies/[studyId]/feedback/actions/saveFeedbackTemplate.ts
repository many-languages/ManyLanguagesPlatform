"use server"

import { createFeedbackTemplateRsc } from "../mutations/createFeedbackTemplate"
import { updateFeedbackTemplateRsc } from "../mutations/updateFeedbackTemplate"
import { syncStudyVariablesRsc } from "../../variables/mutations/syncStudyVariables"
import { extractVariables } from "../../variables/utils/extractVariable"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { FeedbackTemplate } from "../types"

export interface SaveTemplateInput {
  studyId: number
  content: string
  enrichedResult: EnrichedJatosStudyResult
  initialTemplate?: {
    id: number
    content: string
  } | null
}

export interface SaveTemplateResult {
  template: FeedbackTemplate
  success: boolean
}

/**
 * Save or update feedback template and sync variables
 * Orchestrates the business logic for template management
 */
export async function saveFeedbackTemplateAction(
  input: SaveTemplateInput
): Promise<SaveTemplateResult> {
  const { studyId, content, enrichedResult, initialTemplate } = input

  // Validate content
  if (!content.trim()) {
    throw new Error("Template content cannot be empty")
  }

  // Save or update template
  const template = initialTemplate
    ? await updateFeedbackTemplateRsc({
        id: initialTemplate.id,
        content: content.trim(),
      })
    : await createFeedbackTemplateRsc({
        studyId,
        content: content.trim(),
      })

  // Sync variables to database
  const variables = extractVariables(enrichedResult).variables
  await syncStudyVariablesRsc({
    studyId,
    variables: variables.map((v) => ({
      name: v.variableName,
      label: v.variableName,
      type: v.type,
      example: v.exampleValue,
    })),
  })

  return {
    template,
    success: true,
  }
}
