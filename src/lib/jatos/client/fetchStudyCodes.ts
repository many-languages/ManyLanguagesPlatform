import type { JatosAuth } from "./types"

export class FetchStudyCodesError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = "FetchStudyCodesError"
  }
}

export interface FetchStudyCodesParams {
  studyId: string | number
  type: "ps" | "pm" | "gs" | "gm"
  amount?: number
  batchId?: number
  comment?: string
}

/**
 * Fetches study codes from JATOS.
 * Uses POST /jatos/api/v1/studies/{id}/studyCodes (GET deprecated in JATOS API v1.1).
 *
 * @param params - studyId, type, and optional amount, batchId, comment
 * @param auth - JATOS API auth (token required)
 * @returns Array of study code strings (may be empty if none available)
 * @throws Error on JATOS API errors or invalid response
 */
export async function fetchStudyCodes(
  params: FetchStudyCodesParams,
  auth: JatosAuth
): Promise<string[]> {
  const { studyId, type, amount = 1, batchId, comment } = params

  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const body: Record<string, string | number> = {
    type,
    amount,
  }
  if (batchId != null) body.batchId = batchId
  if (comment != null) body.comment = comment

  const res = await fetch(
    `${JATOS_BASE}/jatos/api/v1/studies/${encodeURIComponent(String(studyId))}/studyCodes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  )

  const text = await res.text()

  if (!res.ok) {
    let errMsg: string
    try {
      const json = JSON.parse(text) as { error?: string }
      errMsg = json?.error ?? (text || res.statusText)
    } catch {
      errMsg = text || res.statusText
    }
    throw new FetchStudyCodesError(errMsg || res.statusText, res.status)
  }

  let json: { apiVersion?: string; data?: string[] }
  try {
    json = JSON.parse(text) as { apiVersion?: string; data?: string[] }
  } catch {
    throw new FetchStudyCodesError("JATOS response is not valid JSON", 502)
  }

  const data = json?.data
  if (!Array.isArray(data)) {
    throw new FetchStudyCodesError("JATOS response missing or invalid 'data' array", 502)
  }

  return data
}
