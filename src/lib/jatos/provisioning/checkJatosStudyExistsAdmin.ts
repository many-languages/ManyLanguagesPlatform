import { getAdminToken } from "../getAdminToken"

const JATOS_BASE = process.env.JATOS_BASE

/**
 * Checks whether a study exists in JATOS by UUID or ID.
 * Uses HEAD /jatos/api/v1/studies/{id} (lightweight, no response body).
 * Returns { exists: true } on 204, { exists: false } on 404.
 * Throws for other errors.
 * Admin-only: uses JATOS_TOKEN. For provisioning/setup flows only.
 */
export async function checkJatosStudyExistsAdmin(
  studyIdOrUuid: string
): Promise<{ exists: boolean }> {
  const trimmed = studyIdOrUuid?.trim?.() ?? ""
  if (!trimmed) {
    throw new Error("Missing JATOS study identifier.")
  }
  if (!JATOS_BASE) {
    throw new Error("Missing JATOS_BASE environment variable.")
  }

  const token = getAdminToken()
  const url = `${JATOS_BASE}/jatos/api/v1/studies/${encodeURIComponent(trimmed)}`

  const res = await fetch(url, {
    method: "HEAD",
    headers: {
      Authorization: `Bearer ${token}`,
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
