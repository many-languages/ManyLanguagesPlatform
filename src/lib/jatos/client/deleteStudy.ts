import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

const OPERATION = "Delete study"

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

  let response: Response
  try {
    response = await fetch(jatosUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION, {
    jatosStudyId: typeof id === "number" ? id : undefined,
  })

  return { success: true, message: `Study ${id} deleted successfully.` }
}
