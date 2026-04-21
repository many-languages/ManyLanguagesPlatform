/**
 * Parses `feedbackTemplate.requiredVariableNames` from DB/Prisma JSON into `string[]`, or null if invalid.
 */
export function parseRequiredVariableNamesFromDb(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((v): v is string => typeof v === "string")) {
    return null
  }
  return value
}
