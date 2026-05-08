"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { checkParticipantCompletionForParticipant } from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"

/**
 * Lightweight action to check if participant has completed the study.
 * Only checks metadata - no expensive ZIP downloads or parsing.
 * Use this for auto-checks (focus/visibility events).
 */
export async function checkParticipantCompletionAction(
  studyId: number,
  pseudonym: string,
  jatosStudyId: number
): Promise<{
  success: boolean
  completed: boolean
  error?: string
}> {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, completed: false, error: "Not authenticated" }
    }

    return await checkParticipantCompletionForParticipant({
      studyId,
      pseudonym,
      jatosStudyId,
      userId,
    })
  } catch (error) {
    return {
      success: false,
      completed: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}
