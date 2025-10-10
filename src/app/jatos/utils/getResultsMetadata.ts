"use server"

export async function getResultsMetadata(params: Record<string, any>) {
  const JATOS_BASE = process.env.JATOS_BASE
  const JATOS_TOKEN = process.env.JATOS_TOKEN

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results/metadata`
  const response = await fetch(jatosUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`JATOS API ${response.status}: ${text}`)
  }

  return response.json()
}
