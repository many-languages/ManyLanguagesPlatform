"use server"

import { getBlitzContext } from "@/src/app/blitz-server"
import { getParticipantFeedback } from "@/src/lib/jatos/jatosAccessService"

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
  } catch (error: any) {
    console.error("Error fetching participant feedback:", error)
    return {
      success: false,
      completed: false,
      error: error.message || "Failed to fetch participant feedback",
    }
  }
}
