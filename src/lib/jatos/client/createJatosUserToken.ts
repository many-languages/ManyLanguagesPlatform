import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

export interface CreateJatosUserTokenParams {
  jatosUserId: number
  userId: string
}

export interface CreateJatosUserTokenResponse {
  id: number
  token: string
}

const OPERATION = "Create JATOS user token"

/**
 * Creates a new personal access token for a JATOS user via the admin API.
 * The token is only returned once by JATOS.
 */
export async function createJatosUserToken(
  { jatosUserId, userId }: CreateJatosUserTokenParams,
  auth: JatosAuth
): Promise<CreateJatosUserTokenResponse> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const body = { name: `mlp-researcher-${userId}` }

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/users/${jatosUserId}/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION)

  const text = await response.text()
  let json: { data?: { id?: number; token?: string } }
  try {
    json = JSON.parse(text) as { data?: { id?: number; token?: string } }
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }

  const data = json?.data
  if (!data || typeof data.id !== "number" || !data.token) {
    throw new JatosTransportError(
      `Missing data.id or data.token in ${OPERATION} response`,
      OPERATION
    )
  }

  return { id: data.id, token: data.token }
}
