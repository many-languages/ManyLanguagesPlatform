/**
 * Typed JATOS errors aligned with JATOS API specification.
 * Use for correlation, structured handling, and safe user-facing mapping.
 */

/** Context for correlation when debugging. Attach to errors and logs. */
export type JatosErrorContext = {
  operation: string
  studyId?: number
  jatosStudyId?: number
  userId?: number
}

/**
 * Base for all JATOS API errors. Preserves status, optional JATOS envelope,
 * and structured context. The string message is for humans; the fields are for code.
 */
export class JatosApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly jatosMessage?: string,
    public readonly context?: JatosErrorContext
  ) {
    super(message)
    this.name = "JatosApiError"
  }
}

/**
 * Network or transport failures: fetch timeout, DNS failure, connection refused,
 * invalid JSON on success response, malformed body. No HTTP status (or status 0).
 * Operation is required for correlation — every transport error must have operation context.
 */
export class JatosTransportError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown,
    public readonly context?: Omit<JatosErrorContext, "operation">
  ) {
    super(message)
    this.name = "JatosTransportError"
  }
}

/** 401 Unauthorized — invalid or expired token */
export class JatosUnauthorizedError extends JatosApiError {
  constructor(message: string, code?: string, jatosMessage?: string, context?: JatosErrorContext) {
    super(message, 401, code, jatosMessage, context)
    this.name = "JatosUnauthorizedError"
  }
}

/** 403 Forbidden — token valid but no permission */
export class JatosForbiddenError extends JatosApiError {
  constructor(message: string, code?: string, jatosMessage?: string, context?: JatosErrorContext) {
    super(message, 403, code, jatosMessage, context)
    this.name = "JatosForbiddenError"
  }
}

/** 404 Not Found — study/user/batch/etc. does not exist */
export class JatosNotFoundError extends JatosApiError {
  constructor(message: string, code?: string, jatosMessage?: string, context?: JatosErrorContext) {
    super(message, 404, code, jatosMessage, context)
    this.name = "JatosNotFoundError"
  }
}

/** 400 Bad Request — validation or invalid params */
export class JatosBadRequestError extends JatosApiError {
  constructor(message: string, code?: string, jatosMessage?: string, context?: JatosErrorContext) {
    super(message, 400, code, jatosMessage, context)
    this.name = "JatosBadRequestError"
  }
}

// --- Type guards ---

export function isJatosApiError(e: unknown): e is JatosApiError {
  return e instanceof JatosApiError
}

export function isJatosUnauthorized(e: unknown): e is JatosUnauthorizedError {
  return e instanceof JatosUnauthorizedError
}

// --- User-safe message mapping ---

/**
 * Maps known JATOS error types to safe user-facing messages.
 * Do NOT return error.message by default — it can leak DB errors, raw JATOS text,
 * implementation details, or stack-adjacent operational text.
 */
export function mapJatosErrorToUserMessage(error: unknown): string {
  if (error instanceof JatosUnauthorizedError) return "Session expired. Please sign in again."
  if (error instanceof JatosForbiddenError) return "You don't have permission for this action."
  if (error instanceof JatosNotFoundError) return "The requested resource was not found."
  if (error instanceof JatosBadRequestError) return "Invalid request. Please check your input."
  if (error instanceof JatosTransportError) return "Something went wrong. Please try again."
  if (error instanceof JatosApiError) return "Something went wrong. Please try again."
  return "Something went wrong. Please try again."
}
