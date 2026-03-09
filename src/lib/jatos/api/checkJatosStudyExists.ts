const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

/**
 * Checks whether a study exists in JATOS by UUID or ID.
 * Uses HEAD /jatos/api/v1/studies/{id} (lightweight, no response body).
 * Returns { exists: true } on 204, { exists: false } on 404.
 * Throws for other errors.
 * Note: Requires admin token (per JATOS API spec).
 */
export async function checkJatosStudyExists(studyIdOrUuid: string): Promise<{ exists: boolean }> {
  const trimmed = studyIdOrUuid?.trim?.() ?? ""
  if (!trimmed) {
    throw new Error("Missing JATOS study identifier.")
  }
  if (!JATOS_BASE || !JATOS_TOKEN) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const url = `${JATOS_BASE}/jatos/api/v1/studies/${encodeURIComponent(trimmed)}`

  const res = await fetch(url, {
    method: "HEAD",
    headers: {
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    cache: "no-store",
  })

  if (res.status === 204) {
    return { exists: true }
  }

  if (res.status === 404) {
    return { exists: false }
  }

  const text = await res.text()
  throw new Error(`JATOS study existence check failed (${res.status}): ${text || res.statusText}`)
}
