"use server"

/**
 * Deletes a study from JATOS by its ID.
 * @param id The JATOS study ID (number or string)
 */
export async function deleteJatosStudy(id: string | number) {
  const JATOS_BASE = process.env.JATOS_BASE
  const JATOS_TOKEN = process.env.JATOS_TOKEN

  if (!JATOS_BASE || !JATOS_TOKEN) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/studies/${id}`

  const response = await fetch(jatosUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`JATOS API error ${response.status}: ${errorText}`)
  }

  return { success: true, message: `Study ${id} deleted successfully.` }
}
