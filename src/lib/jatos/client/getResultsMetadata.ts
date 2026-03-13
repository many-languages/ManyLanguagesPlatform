import type { JatosAuth } from "./types"

export async function getResultsMetadata(params: Record<string, unknown>, auth: JatosAuth) {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results/metadata?download=false`
  const response = await fetch(jatosUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`JATOS API ${response.status}: ${text}`)
  }

  return response.json()
}
