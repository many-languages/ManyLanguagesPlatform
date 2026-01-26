const JATOS_BASE = process.env.JATOS_BASE!
const JATOS_TOKEN = process.env.JATOS_TOKEN!

/**
 * Checks whether a study exists in JATOS by UUID or ID.
 * Returns { exists: true } on 200, { exists: false } on 404.
 * Throws for other errors.
 */
export async function checkJatosStudyExists(studyIdOrUuid: string): Promise<{ exists: boolean }> {
  const trimmed = studyIdOrUuid?.trim?.() ?? ""
  if (!trimmed) {
    throw new Error("Missing JATOS study identifier.")
  }
  if (!JATOS_BASE || !JATOS_TOKEN) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const url = `${JATOS_BASE}/jatos/api/v1/studies/${trimmed}/properties?withComponentProperties=false&withBatchProperties=false`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    cache: "no-store",
  })

  if (res.status === 404) {
    return { exists: false }
  }

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`JATOS properties fetch failed (${res.status}): ${text}`)
  }

  return { exists: true }
}
