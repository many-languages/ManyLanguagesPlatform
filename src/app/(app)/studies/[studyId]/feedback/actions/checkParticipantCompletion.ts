"use server"

import { getParticipantPseudonymRsc } from "../../../queries/getParticipantPseudonym"
import { findStudyResultIdByComment } from "@/src/lib/jatos/api/findStudyResultIdByComment"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"

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
    // Security check: Verify that the pseudonym belongs to the authenticated user
    const participant = await getParticipantPseudonymRsc(studyId)
    if (!participant) {
      return { success: false, completed: false, error: "Participant not found" }
    }
    if (participant.pseudonym !== pseudonym) {
      return {
        success: false,
        completed: false,
        error: "Pseudonym does not match authenticated user",
      }
    }

    // Get metadata to check if results exist (lightweight - no ZIP download)
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] })

    // Check if results exist for this participant's pseudonym
    const resultId = findStudyResultIdByComment(metadata, pseudonym)
    const completed = resultId !== null

    return {
      success: true,
      completed,
    }
  } catch (error: any) {
    console.error("Error checking participant completion:", error)
    return {
      success: false,
      completed: false,
      error: error.message || "Failed to check participant completion",
    }
  }
}
