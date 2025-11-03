/**
 * JATOS API Client
 *
 * Typed helper for calling JATOS API routes with consistent error handling.
 * Eliminates boilerplate fetch/error handling code across the codebase.
 *
 * @example
 * ```ts
 * import { callJatosApi } from "@/src/lib/jatos/api/client"
 * import type { CreatePersonalStudyCodeResponse } from "@/src/types/jatos-api"
 *
 * const { code } = await callJatosApi<CreatePersonalStudyCodeResponse>(
 *   "/create-personal-studycode",
 *   {
 *     method: "POST",
 *     body: { jatosStudyId, jatosBatchId, type, comment },
 *   }
 * )
 * ```
 */

import type { JatosApiError } from "@/src/types/jatos-api"

export interface JatosApiClientOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

/**
 * Calls a JATOS API route with type-safe response and consistent error handling.
 *
 * @param endpoint - API endpoint path (without /api/jatos prefix)
 * @param options - Fetch options with typed body support
 * @returns Typed response data
 * @throws Error with user-friendly message if request fails
 */
export async function callJatosApi<T>(
  endpoint: string,
  options: JatosApiClientOptions = {}
): Promise<T> {
  const { body, headers, ...restOptions } = options

  const res = await fetch(`/api/jatos${endpoint}`, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...restOptions,
  })

  const data = await res.json()

  if (!res.ok) {
    const error = data as JatosApiError
    throw new Error(error.error || `API request failed: ${res.status}`)
  }

  return data as T
}
