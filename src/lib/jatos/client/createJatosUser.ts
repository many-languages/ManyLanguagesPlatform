import { randomBytes } from "crypto"
import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

export interface CreateJatosUserParams {
  username: string
  name: string
  email?: string
  /** JATOS role. Default is USER. Use VIEWER for read-only service accounts. */
  role?: "VIEWER" | "USER"
}

export interface CreateJatosUserResponse {
  id: number
  username: string
}

const OPERATION = "Create JATOS user"

/**
 * Creates a new JATOS user via the admin API.
 * Generates a strong, one-time random password for the user since
 * they will only be used as a service account via API tokens.
 */
export async function createJatosUser(
  { username, name, email, role }: CreateJatosUserParams,
  auth: JatosAuth
): Promise<CreateJatosUserResponse> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const password = randomBytes(32).toString("base64url")
  const body: Record<string, unknown> = { username, name, email, authMethod: "DB", password }
  if (role) body.role = role

  let response: Response
  try {
    response = await fetch(`${JATOS_BASE}/jatos/api/v1/users`, {
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
  let json: { data?: { id?: number; username?: string } }
  try {
    json = JSON.parse(text) as { data?: { id?: number; username?: string } }
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }

  const data = json?.data
  if (!data || typeof data.id !== "number" || !data.username) {
    throw new JatosTransportError(
      `Missing data.id or data.username in ${OPERATION} response`,
      OPERATION
    )
  }

  return { id: data.id, username: data.username }
}
