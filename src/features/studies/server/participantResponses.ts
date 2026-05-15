import { checkStudyParticipantResponsePresence } from "@/src/lib/jatos/jatosAccessService"

/**
 * Whether the study has any non-pilot FINISHED JATOS results.
 * Short-circuits to false when there is no JATOS upload / UUID (cannot have responses yet).
 * Uses the study service account token for metadata (same family as participant dashboard reads).
 *
 * @throws Error with a user-facing message if JATOS metadata cannot be fetched (fail closed).
 */
export async function studyHasParticipantResponses(studyId: number): Promise<boolean> {
  return checkStudyParticipantResponsePresence({ studyId })
}

/**
 * Same as {@link studyHasParticipantResponses} but returns `null` if JATOS/metadata cannot be read
 * (e.g. admin list UI without failing the whole page).
 */
export async function studyHasParticipantResponsesSafe(studyId: number): Promise<boolean | null> {
  try {
    return await studyHasParticipantResponses(studyId)
  } catch {
    return null
  }
}
