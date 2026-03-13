import type { JatosAuth } from "./types"

/**
 * Fetches the asset structure (file tree) for a JATOS study.
 * GET /jatos/api/v1/studies/{id}/assets/structure
 */
export async function getAssetStructure(
  studyId: string | number,
  auth: JatosAuth
): Promise<unknown> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/assets/structure`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`JATOS asset structure fetch failed (${res.status}): ${text}`)
  }

  return JSON.parse(text)
}
