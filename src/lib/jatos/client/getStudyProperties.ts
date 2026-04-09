import type { JatosStudyProperties } from "@/src/types/jatos"
import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

const OPERATION = "Fetch study properties"

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

  let response: Response
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      cache: "no-store",
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION)

  const text = await response.text()
  let json: { data?: JatosStudyProperties }
  try {
    json = JSON.parse(text) as { data?: JatosStudyProperties }
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }

  if (json.data == null) {
    throw new JatosTransportError(`Missing data in ${OPERATION} response`, OPERATION)
  }

  return json.data
}
