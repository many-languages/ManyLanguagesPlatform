import type { JatosAuth } from "./types"

/**
 * Deletes a study from JATOS by its ID.
 * @param id The JATOS study ID (number or string)
 * @param auth - JATOS API auth (token required)
 */
export async function deleteJatosStudy(id: string | number, auth: JatosAuth) {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/studies/${id}`

  const response = await fetch(jatosUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`JATOS API error ${response.status}: ${errorText}`)
  }

  return { success: true, message: `Study ${id} deleted successfully.` }
}
