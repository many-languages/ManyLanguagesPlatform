import { z } from "zod"

export const PARTICIPANT_STUDY_VIEWS = [
  "all",
  "completed",
  "not_completed",
  "completed_not_paid",
] as const
export type ParticipantStudyView = (typeof PARTICIPANT_STUDY_VIEWS)[number]

export const participantStudyViewQuerySchema = z.enum(PARTICIPANT_STUDY_VIEWS)

export type ParticipantStudyViewQueryParseResult =
  | { success: true; view: ParticipantStudyView }
  | { success: false }

/** Missing or blank → `"all"`; rejects unknown values (strict URL validation). */
export function parseParticipantStudyViewQueryParam(
  value: string | undefined
): ParticipantStudyViewQueryParseResult {
  const trimmed = value?.trim()
  if (trimmed === undefined || trimmed === "") {
    return { success: true, view: "all" }
  }
  const parsed = participantStudyViewQuerySchema.safeParse(trimmed)
  return parsed.success ? { success: true, view: parsed.data } : { success: false }
}
