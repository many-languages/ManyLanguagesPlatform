import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

const OPERATION = "Fetch asset structure"

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

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/studies/${studyId}/assets/structure`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION)

  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }
}
