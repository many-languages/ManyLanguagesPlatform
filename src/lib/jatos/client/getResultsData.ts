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

import type { JatosAuth, GetResultsDataResponse } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"

const OPERATION = "Fetch results data"

/**
 * Fetch raw result data from JATOS (data.txt contents as ZIP).
 * ID params (studyIds, studyResultIds, etc.) must be integers or integer arrays per JATOS spec.
 */
export async function getResultsData(
  params: Record<string, unknown>,
  auth: JatosAuth
): Promise<GetResultsDataResponse> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  validateResultIdsParams(params)

  const jatosUrl = `${JATOS_BASE}/jatos/api/v1/results/data`

  let response: Response
  try {
    response = await fetch(jatosUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify(params),
    })
  } catch (cause) {
    throw new JatosTransportError(`Network error during ${OPERATION}`, OPERATION, cause)
  }

  await throwIfJatosError(response, OPERATION)

  try {
    const arrayBuffer = await response.arrayBuffer()
    const contentType = response.headers.get("Content-Type") || "application/octet-stream"
    return {
      success: true as const,
      contentType,
      data: arrayBuffer,
    }
  } catch (cause) {
    throw new JatosTransportError(`Failed to read ${OPERATION} response body`, OPERATION, cause)
  }
}
