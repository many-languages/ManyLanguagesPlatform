"use server"

import { createFeedbackTemplateRsc } from "../mutations/createFeedbackTemplate"
import { updateFeedbackTemplateRsc } from "../mutations/updateFeedbackTemplate"
import type { FeedbackTemplate } from "../types"
import db from "db"
import { extractRequiredVariableNames } from "../utils/requiredKeys"

export interface SaveTemplateInput {
  studyId: number
  content: string
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
  const { studyId, content, initialTemplate } = input

  // Validate content
  if (!content.trim()) {
    throw new Error("Template content cannot be empty")
  }

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      setupRevision: true,
      approvedExtraction: {
        select: {
          id: true,
          extractorVersion: true,
        },
      },
    },
  })

  if (!study?.approvedExtraction) {
    throw new Error("No approved extraction found for this study")
  }

  const requiredVariableKeys = extractRequiredVariableNames(content.trim())

  // Save or update template
  const template = initialTemplate
    ? await updateFeedbackTemplateRsc({
        id: initialTemplate.id,
        content: content.trim(),
        setupRevision: study.setupRevision,
        extractionSnapshotId: study.approvedExtraction.id,
        extractorVersion: study.approvedExtraction.extractorVersion,
        requiredVariableKeys,
      })
    : await createFeedbackTemplateRsc({
        studyId,
        content: content.trim(),
        setupRevision: study.setupRevision,
        extractionSnapshotId: study.approvedExtraction.id,
        extractorVersion: study.approvedExtraction.extractorVersion,
        requiredVariableKeys,
      })

  return {
    template,
    success: true,
  }
}
