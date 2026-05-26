import db from "db"

import { notifyAdminsOfPendingStudyReview } from "@/src/features/notifications"
import {
  getSetupCompletionRsc,
  isSetupCompleteFromFlags,
  type SetupStepFlags,
} from "@/src/features/studies/services"
import type { FeedbackTemplateRscRow } from "@/src/features/feedback/feedbackTemplateRscSelect"
import type { SaveFeedbackTemplateActionInput } from "@/src/features/feedback/validations"
import { extractRequiredVariableNames } from "@/src/features/feedback/domain/requiredVariableNames"
import { createFeedbackTemplateRsc } from "@/src/features/feedback/server/createFeedbackTemplate"
import { updateFeedbackTemplateRsc } from "@/src/features/feedback/server/updateFeedbackTemplate"

export type SaveFeedbackTemplateWorkflowInput = SaveFeedbackTemplateActionInput

export interface SaveFeedbackTemplateWorkflowResult {
  template: FeedbackTemplateRscRow
  setupComplete: boolean
}

export async function saveFeedbackTemplateAndNotify(
  input: SaveFeedbackTemplateWorkflowInput
): Promise<SaveFeedbackTemplateWorkflowResult> {
  const { studyId, content, initialTemplate } = input
  const requiredVariableNames = extractRequiredVariableNames(content)

  const template = initialTemplate
    ? await updateFeedbackTemplateRsc({
        id: initialTemplate.id,
        content,
        requiredVariableNames,
      })
    : await createFeedbackTemplateRsc({
        studyId,
        content,
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
