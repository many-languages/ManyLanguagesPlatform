"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { getParticipantFeedback } from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"

export async function fetchParticipantFeedbackAction(
  studyId: number,
  pseudonym: string,
  jatosStudyId: number
) {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, completed: false, error: "Not authenticated" }
    }

    return await getParticipantFeedback({ studyId, pseudonym, jatosStudyId, userId })
  } catch (error) {
    return {
      success: false,
      completed: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}
