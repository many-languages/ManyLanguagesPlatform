const INT_ID_KEYS = [
  "studyIds",
  "studyResultIds",
  "componentIds",
  "componentResultIds",
  "batchIds",
  "groupIds",
] as const

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value)
}

function isIntArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isInt)
}

function validateResultIdsParams(params: Record<string, unknown>): void {
  for (const key of INT_ID_KEYS) {
    const value = params[key]
    if (value == null) continue
    if (!isInt(value) && !isIntArray(value)) {
      throw new Error(
        `JATOS results API: "${key}" must be an integer or array of integers, got ${typeof value}`
      )
    }
  }
}

import type { JatosAuth } from "./types"

/**
 * Fetch raw result data from JATOS (data.txt contents as ZIP).
 * ID params (studyIds, studyResultIds, etc.) must be integers or integer arrays per JATOS spec.
 */
export async function getResultsData(params: Record<string, unknown>, auth: JatosAuth) {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  validateResultIdsParams(params)

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results/data`

  // The JATOS API supports posting JSON body, but response is binary (ZIP)
  const response = await fetch(jatosUrl, {
    method: "POST",
    headers: {
      // ✅ Don't force application/json for the response — only for the body
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
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
