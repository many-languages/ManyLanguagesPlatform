import type { JatosStudyProperties } from "@/src/types/jatos"

/**
 * Fetches JATOS study properties (server-side utility).
 * Returns the `data` field only, excluding `apiVersion`.
 */
export async function getStudyProperties(
  studyId: string,
  options?: { token?: string }
): Promise<JatosStudyProperties> {
  const JATOS_BASE = process.env.JATOS_BASE
  const token = options?.token ?? process.env.JATOS_TOKEN
  if (!JATOS_BASE || !token) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const url = `${JATOS_BASE}/jatos/api/v1/studies/${studyId}/properties?withComponentProperties=true&withBatchProperties=true`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
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
