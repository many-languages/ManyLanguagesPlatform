"use server"

import db from "db"

import { notifyAdminsOfPendingStudyReview } from "@/src/features/notifications"
import { getSetupCompletionRsc } from "@/src/features/studies/queries/getSetupCompletion"
import { isSetupCompleteFromFlags, type SetupStepFlags } from "@/src/features/studies"
import { createFeedbackTemplateRsc } from "../mutations/createFeedbackTemplate"
import { updateFeedbackTemplateRsc } from "../mutations/updateFeedbackTemplate"
import type { FeedbackTemplate, FeedbackTemplateEditorInitial } from "@/src/features/feedback/types"
import { extractRequiredVariableNames } from "@/src/features/feedback/domain/requiredVariableNames"
import { mapFeedbackTemplateSaveErrorToUserMessage } from "@/src/features/feedback/domain/mapFeedbackTemplateSaveErrorToUserMessage"

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

    const flags = (await getSetupCompletionRsc(studyId)) as SetupStepFlags
    const setupComplete = isSetupCompleteFromFlags(flags)

    // Push "new study pending admin review" to staff admins on the canonical submission
    // transition: first-time feedback template creation whose save leaves the study in the
    // admin-review queue (setup complete + not yet admin-approved). Updates to an existing
    // template are intentionally skipped — admins already saw it when it was first submitted.
    if (!initialTemplate && setupComplete) {
      const studyRow = await db.study.findUnique({
        where: { id: studyId },
        select: { id: true, title: true, adminApproved: true, archived: true },
      })

      if (studyRow && studyRow.adminApproved === null && !studyRow.archived) {
        // Fire-and-forget style: failures here must not roll back the save the user just made.
        notifyAdminsOfPendingStudyReview({
          studyId: studyRow.id,
          studyTitle: studyRow.title,
        }).catch((error) => {
          console.error("notifyAdminsOfPendingStudyReview failed:", error)
        })
      }
    }

    return { ok: true, template, setupComplete }
  } catch (error) {
    console.error("saveFeedbackTemplateAction:", error)
    return { ok: false, userMessage: mapFeedbackTemplateSaveErrorToUserMessage(error) }
  }
}
