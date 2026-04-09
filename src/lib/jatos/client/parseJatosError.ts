/**
 * Parse non-2xx JATOS responses to extract the ApiEnvelopeError format.
 */

interface JatosErrorEnvelope {
  apiVersion?: string
  error?: { code?: string; message?: string } | string
}

export async function parseJatosErrorResponse(
  response: Response
): Promise<{ code?: string; message?: string }> {
  const text = await response.text()
  let envelope: JatosErrorEnvelope | null = null
  try {
    envelope = JSON.parse(text) as JatosErrorEnvelope
  } catch {
    return { message: text || response.statusText }
  }
  const err = envelope?.error
  const message =
    typeof err === "string"
      ? err
      : (typeof err === "object" && err?.message) || text || response.statusText
  const code = typeof err === "object" && err !== null ? err.code : undefined
  return { code, message }
}
