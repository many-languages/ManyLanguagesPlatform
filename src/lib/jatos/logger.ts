/**
 * Central logging for JATOS operations.
 * Distinguish expected (best-effort miss) vs unexpected (API/transport failure).
 */

import {
  JatosApiError,
  JatosBadRequestError,
  JatosForbiddenError,
  JatosNotFoundError,
  JatosTransportError,
  JatosUnauthorizedError,
} from "./errors"

export type JatosLogContext = {
  operation: string
  userId?: number
  studyId?: number
  jatosStudyId?: number
  error?: unknown
}

type SanitizedJatosError = {
  name: string
  category: string
  status?: number
  code?: string
  operation?: string
  causeName?: string
}

export type SanitizedJatosLogContext = {
  operation: string
  userId?: number
  studyId?: number
  jatosStudyId?: number
  error?: SanitizedJatosError
}

function getErrorCategory(error: unknown): string {
  if (error instanceof JatosUnauthorizedError) return "unauthorized"
  if (error instanceof JatosForbiddenError) return "forbidden"
  if (error instanceof JatosNotFoundError) return "not_found"
  if (error instanceof JatosBadRequestError) return "bad_request"
  if (error instanceof JatosTransportError) return "transport"
  if (error instanceof JatosApiError) return "api"
  if (error instanceof Error) return "unexpected"
  return "unknown"
}

function sanitizeJatosError(error: unknown): SanitizedJatosError {
  const name = error instanceof Error ? error.name : typeof error
  const category = getErrorCategory(error)

  if (error instanceof JatosTransportError) {
    return {
      name,
      category,
      operation: error.operation,
      causeName: error.cause instanceof Error ? error.cause.name : undefined,
    }
  }

  if (error instanceof JatosApiError) {
    return {
      name,
      category,
      status: error.status,
      code: error.code,
      operation: error.context?.operation,
    }
  }

  return { name, category }
}

export function sanitizeJatosLogContext(context: JatosLogContext): SanitizedJatosLogContext {
  return {
    operation: context.operation,
    userId: context.userId,
    studyId: context.studyId,
    jatosStudyId: context.jatosStudyId,
    error: context.error === undefined ? undefined : sanitizeJatosError(context.error),
  }
}

export function logJatosError(message: string, context: JatosLogContext) {
  console.error(`[JATOS] ${message}`, sanitizeJatosLogContext(context))
  // Optional: send to error reporting (e.g. Sentry)
}

export function logJatosWarning(message: string, context: JatosLogContext) {
  console.warn(`[JATOS] ${message}`, sanitizeJatosLogContext(context))
}
