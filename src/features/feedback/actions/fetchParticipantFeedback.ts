"use server"

import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import type { FetchParticipantFeedbackActionResult } from "@/src/features/feedback/types"
import { loadParticipantFeedbackViewModel } from "@/src/features/feedback/server/loadParticipantFeedback"

/**
 * Loads the latest feedback template from the DB and renders markdown (same pipeline as RSC).
 * Does not accept client-supplied template content — smaller payload and always current template.
 */
export async function fetchParticipantFeedbackAction(
  studyId: number,
  pseudonym: string,
  jatosStudyId: number
): Promise<FetchParticipantFeedbackActionResult> {
  try {
    return await loadParticipantFeedbackViewModel(studyId, pseudonym, jatosStudyId)
  } catch (error) {
    return {
      kind: "done",
      loaded: { kind: "failed", error: mapJatosErrorToUserMessage(error) },
    }
  }
}
