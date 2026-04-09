"use server"

import { getSetupCompletionRsc } from "../queries/getSetupCompletion"
import { STEP_KEYS } from "../utils/constants"

/**
 * Authoritative setup completion for the latest upload + step 1 derivation (same basis as RSC).
 * Use when the client must decide messaging without inferring from a prior save in the same session.
 */
export async function getSetupCompletionAction(
  studyId: number
): Promise<{ setupComplete: boolean }> {
  const flags = await getSetupCompletionRsc(studyId)
  const setupComplete = STEP_KEYS.every((key) => flags[key] === true)
  return { setupComplete }
}
