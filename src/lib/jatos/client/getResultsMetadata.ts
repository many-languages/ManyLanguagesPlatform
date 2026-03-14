import type { JatosMetadata } from "@/src/types/jatos"
import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

const OPERATION = "Fetch results metadata"

export async function getResultsMetadata(
  params: Record<string, unknown>,
  auth: JatosAuth
): Promise<JatosMetadata> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results/metadata?download=false`
  let response: Response
  try {
    response = await fetch(jatosUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(params),
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION)

  try {
    const json = await response.json()
    return json as JatosMetadata
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }
}
