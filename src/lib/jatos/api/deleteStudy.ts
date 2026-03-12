"use server"

/**
 * Deletes a study from JATOS by its ID.
 * @param id The JATOS study ID (number or string)
 * @param options - optional token for JATOS API auth
 */
export async function deleteJatosStudy(id: string | number, options?: { token?: string }) {
  const JATOS_BASE = process.env.JATOS_BASE
  const token = options?.token ?? process.env.JATOS_TOKEN

  if (!JATOS_BASE || !token) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/studies/${id}`

  const response = await fetch(jatosUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`JATOS API error ${response.status}: ${errorText}`)
  }

  return { success: true, message: `Study ${id} deleted successfully.` }
}
