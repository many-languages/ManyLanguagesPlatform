import type { JatosStudyResult } from "@/src/types/jatos"

const PILOT_COMMENT_PREFIX = "pilot:"

/**
 * Returns true if the result is from a participant (not a pilot run).
 * Pilot runs have comment starting with "pilot:".
 */
export function isNonPilotResponse(result: JatosStudyResult): boolean {
  const comment = result.comment ?? ""
  return !comment.includes(PILOT_COMMENT_PREFIX)
}

/**
 * Counts non-pilot, FINISHED study results (participant responses).
 * Excludes pilot runs (comment contains "pilot:").
 */
export function countNonPilotResponses(studyResults: JatosStudyResult[]): number {
  return studyResults.filter((r) => isNonPilotResponse(r) && r.studyState === "FINISHED").length
}

/**
 * Returns true if the study has any participant responses (non-pilot, FINISHED).
 */
export function hasParticipantResponses(studyResults: JatosStudyResult[]): boolean {
  return countNonPilotResponses(studyResults) > 0
}
