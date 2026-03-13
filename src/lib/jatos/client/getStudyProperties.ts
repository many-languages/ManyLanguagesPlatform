import type { JatosStudyProperties } from "@/src/types/jatos"
import type { JatosAuth } from "./types"

/**
 * Fetches JATOS study properties (server-side utility).
 * Returns the `data` field only, excluding `apiVersion`.
 */
export async function getStudyProperties(
  studyId: string,
  auth: JatosAuth
): Promise<JatosStudyProperties> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const url = `${JATOS_BASE}/jatos/api/v1/studies/${studyId}/properties?withComponentProperties=true&withBatchProperties=true`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    cache: "no-store",
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`JATOS properties fetch failed (${res.status}): ${text}`)
  }

  const json = JSON.parse(text)

  // ✅ Return only the "data" object (the study itself)
  return json.data as JatosStudyProperties
}
