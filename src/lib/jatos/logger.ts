/**
 * Central logging for JATOS operations.
 * Distinguish expected (best-effort miss) vs unexpected (API/transport failure).
 */

export type JatosLogContext = {
  operation: string
  userId?: number
  studyId?: number
  jatosStudyId?: number
  error?: unknown
}

export function logJatosError(message: string, context: JatosLogContext) {
  console.error(`[JATOS] ${message}`, context)
  // Optional: send to error reporting (e.g. Sentry)
}

export function logJatosWarning(message: string, context: JatosLogContext) {
  console.warn(`[JATOS] ${message}`, context)
}
