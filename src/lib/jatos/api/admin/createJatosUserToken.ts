export interface CreateJatosUserTokenParams {
  jatosUserId: number
  userId: string
}

export interface CreateJatosUserTokenResponse {
  id: number
  token: string
}

/**
 * Creates a new personal access token for a JATOS user via the admin API.
 * The token is only returned once by JATOS.
 */
export async function createJatosUserToken({
  jatosUserId,
  userId,
}: CreateJatosUserTokenParams): Promise<CreateJatosUserTokenResponse> {
  const JATOS_BASE = process.env.JATOS_BASE
  const JATOS_TOKEN = process.env.JATOS_TOKEN

  if (!JATOS_BASE || !JATOS_TOKEN) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const body = {
    name: `mlp-researcher-${userId}`,
  }

  const res = await fetch(`${JATOS_BASE}/jatos/api/v1/users/${jatosUserId}/tokens`, {
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
    throw new Error(`Failed to create JATOS user token (${res.status}): ${errMsg}`)
  }

  let json: { data?: { id?: number; token?: string } }
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error("JATOS response is not valid JSON")
  }

  const data = json?.data
  if (!data || typeof data.id !== "number" || !data.token) {
    throw new Error("JATOS response missing 'data.id' or 'data.token'")
  }

  return {
    id: data.id,
    token: data.token,
  }
}
