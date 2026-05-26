import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"
import { StudyCodesEnvelopeSchema } from "../schemas"
import { parseJatosTextResponse } from "./parseJatosResponse"

export interface FetchStudyCodesParams {
  studyId: string | number
  type: "ps" | "pm" | "gs" | "gm"
  amount?: number
  batchId?: number
  comment?: string
}

const OPERATION = "Fetch study codes"

/**
 * Fetches study codes from JATOS.
 * Uses POST /jatos/api/v1/studies/{id}/studyCodes (GET deprecated in JATOS API v1.1).
 *
 * @param params - studyId, type, and optional amount, batchId, comment
 * @param auth - JATOS API auth (token required)
 * @returns Array of study code strings (may be empty if none available)
 * @throws JatosApiError / JatosTransportError on JATOS API errors or invalid response
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

  let response: Response
  try {
    response = await fetch(
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
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION, {
    jatosStudyId: typeof studyId === "number" ? studyId : undefined,
  })

  const text = await response.text()
  const { data } = parseJatosTextResponse(OPERATION, text, StudyCodesEnvelopeSchema)

  return data
}
