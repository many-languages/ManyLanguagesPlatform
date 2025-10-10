const JATOS_BASE = process.env.JATOS_BASE
const JATOS_TOKEN = process.env.JATOS_TOKEN

/**
 * Fetch raw result data from JATOS (data.txt contents as ZIP).
 */
export async function getResultsData(params: Record<string, string>) {
  if (!JATOS_BASE || !JATOS_TOKEN) {
    throw new Error("Missing JATOS_BASE or JATOS_TOKEN environment variables.")
  }

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results/data`

  // The JATOS API supports posting JSON body, but response is binary (ZIP)
  const response = await fetch(jatosUrl, {
    method: "POST",
    headers: {
      // ✅ Don't force application/json for the response — only for the body
      "Content-Type": "application/json",
      Authorization: `Bearer ${JATOS_TOKEN}`,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`JATOS API error ${response.status}: ${errorText}`)
  }

  // ✅ Read it as binary
  const arrayBuffer = await response.arrayBuffer()
  const contentType = response.headers.get("Content-Type") || "application/octet-stream"

  return {
    success: true,
    contentType,
    data: arrayBuffer, // binary ZIP data
  }
}
