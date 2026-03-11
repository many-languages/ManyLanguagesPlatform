import { randomBytes } from "crypto"

export interface CreateJatosUserParams {
  username: string
  name: string
  email?: string
}

export interface CreateJatosUserResponse {
  id: number
  username: string
}

/**
 * Creates a new JATOS user via the admin API.
 * Generates a strong, one-time random password for the user since
 * they will only be used as a service account via API tokens.
 */
export async function createJatosUser({
  username,
  name,
  email,
}: CreateJatosUserParams): Promise<CreateJatosUserResponse> {
  const JATOS_BASE = process.env.JATOS_BASE
  const JATOS_TOKEN = process.env.JATOS_TOKEN

  if (!JATOS_BASE || !JATOS_TOKEN) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  // Generate a one-time random password for the service account
  const password = randomBytes(32).toString("base64url")

  const body = {
    username,
    name,
    email,
    authMethod: "DB",
    password,
  }

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()

  if (!res.ok) {
    let errMsg: string
    try {
      const json = JSON.parse(text) as { error?: string }
      errMsg = json?.error ?? (text || res.statusText)
    } catch {
      errMsg = text || res.statusText
    }
    throw new Error(`Failed to create JATOS user (${res.status}): ${errMsg}`)
  }

  let json: { data?: { id?: number; username?: string } }
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error("JATOS response is not valid JSON")
  }

  const data = json?.data
  if (!data || typeof data.id !== "number" || !data.username) {
    throw new Error("JATOS response missing 'data.id' or 'data.username'")
  }

  return {
    id: data.id,
    username: data.username,
  }
}
