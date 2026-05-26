import { Id } from "../validations"

/**
 * Parses a dynamic `[studyId]` route segment into a positive integer study id.
 * Returns null for non-decimal strings, zero, negatives, floats, and scientific notation.
 */
export function parseStudyIdParam(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) {
    return null
  }

  const n = Number(raw)
  const result = Id.safeParse(n)
  return result.success ? result.data : null
}
