import { z } from "zod"

export const STUDY_VIEWS = ["all", "active", "archived", "incomplete"] as const
export type StudyView = (typeof STUDY_VIEWS)[number]

export const studyViewQuerySchema = z.enum(STUDY_VIEWS)

export type StudyViewQueryParseResult = { success: true; view: StudyView } | { success: false }

/** Missing or blank → `"all"`; rejects unknown values (strict URL validation). */
export function parseStudyViewQueryParam(value: string | undefined): StudyViewQueryParseResult {
  const trimmed = value?.trim()
  if (trimmed === undefined || trimmed === "") {
    return { success: true, view: "all" }
  }
  const parsed = studyViewQuerySchema.safeParse(trimmed)
  return parsed.success ? { success: true, view: parsed.data } : { success: false }
}
