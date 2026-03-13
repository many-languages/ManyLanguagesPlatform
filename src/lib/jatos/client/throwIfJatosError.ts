/**
 * Centralized status→typed-error mapping for JATOS API responses.
 * Use in each client function after fetch when response.ok is false.
 */

import { parseJatosErrorResponse } from "./parseJatosError"
import type { JatosErrorContext } from "../errors"
import {
  JatosApiError,
  JatosUnauthorizedError,
  JatosForbiddenError,
  JatosNotFoundError,
  JatosBadRequestError,
} from "../errors"

export async function throwIfJatosError(
  response: Response,
  operation: string,
  context?: Omit<JatosErrorContext, "operation">
): Promise<void> {
  if (response.ok) return

  const { code, message } = await parseJatosErrorResponse(response)
  const errMsg = `${operation} failed (${response.status}): ${message || response.statusText}`
  const ctx: JatosErrorContext = { operation, ...context }

  if (response.status === 401) throw new JatosUnauthorizedError(errMsg, code, message, ctx)
  if (response.status === 403) throw new JatosForbiddenError(errMsg, code, message, ctx)
  if (response.status === 404) throw new JatosNotFoundError(errMsg, code, message, ctx)
  if (response.status === 400) throw new JatosBadRequestError(errMsg, code, message, ctx)
  throw new JatosApiError(errMsg, response.status, code, message, ctx)
}
