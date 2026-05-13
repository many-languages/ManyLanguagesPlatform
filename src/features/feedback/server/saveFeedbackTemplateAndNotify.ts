import db from "db"

import { notifyAdminsOfPendingStudyReview } from "@/src/features/notifications"
import {
  getSetupCompletionRsc,
  isSetupCompleteFromFlags,
  type SetupStepFlags,
} from "@/src/features/studies/services"
import type { FeedbackTemplate, FeedbackTemplateEditorInitial } from "@/src/features/feedback/types"
import { extractRequiredVariableNames } from "@/src/features/feedback/domain/requiredVariableNames"
import { createFeedbackTemplateRsc } from "@/src/features/feedback/server/createFeedbackTemplate"
import { updateFeedbackTemplateRsc } from "@/src/features/feedback/server/updateFeedbackTemplate"

export interface SaveFeedbackTemplateWorkflowInput {
  studyId: number
  content: string
  initialTemplate?: Pick<FeedbackTemplateEditorInitial, "id" | "content"> | null
}

export interface SaveFeedbackTemplateWorkflowResult {
  template: FeedbackTemplate
  setupComplete: boolean
}

export async function saveFeedbackTemplateAndNotify(
  input: SaveFeedbackTemplateWorkflowInput
): Promise<SaveFeedbackTemplateWorkflowResult> {
  const { studyId, content, initialTemplate } = input
  const trimmedContent = content.trim()
  const requiredVariableNames = extractRequiredVariableNames(trimmedContent)

  const template = initialTemplate
    ? await updateFeedbackTemplateRsc({
        id: initialTemplate.id,
        content: trimmedContent,
        requiredVariableNames,
      })
    : await createFeedbackTemplateRsc({
        studyId,
        content: trimmedContent,
        requiredVariableNames,
      })

  const flags = (await getSetupCompletionRsc(studyId)) as SetupStepFlags
  const setupComplete = isSetupCompleteFromFlags(flags)

  // Push "new study pending admin review" to staff admins on the canonical submission
  // transition: first-time feedback template creation whose save leaves the study in the
  // admin-review queue (setup complete + not yet admin-approved). Updates to an existing
  // template are intentionally skipped; admins already saw it when it was first submitted.
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

  return { template, setupComplete }
}
