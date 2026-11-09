import type { JatosAuth } from "./types"
import { throwIfJatosError } from "./throwIfJatosError"
import { JatosTransportError } from "../errors"
import { JatosStudyLogSchema } from "../schemas"
import type { z } from "zod"
import { parseJatosResponse } from "./parseJatosResponse"

export type JatosStudyLogEntry = Exclude<z.infer<typeof JatosStudyLogSchema>[number], string>

export interface GetStudyLogParams {
  studyId: string | number
  /** Maximum number of (newest) entries. Omit for the full log. */
  entryLimit?: number
}

export interface GetStudyLogResult {
  /** Newest entries first, as sent by JATOS. */
  entries: JatosStudyLogEntry[]
  /** True when `entryLimit` cut the log (JATOS appended a "Log is cut here" marker). */
  truncated: boolean
}

const OPERATION = "Fetch study log"

/**
 * JATOS declares the response as NDJSON but sends one JSON array. Accept either so a future
 * JATOS release that really streams lines does not break parsing.
 */
function parseLogBody(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    // fall through to line-by-line parsing
  }

  try {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch (cause) {
    throw new JatosTransportError(`Invalid JSON in ${OPERATION} response`, OPERATION, cause)
  }
}

/**
 * Fetches the study log of a JATOS study.
 * Uses GET /jatos/api/v1/studies/{id}/log?download=false (log lines, newest first).
 *
 * Study run starts are recorded here even when the run failed before any component result existed;
 * `results/metadata` does not list such runs.
 *
 * @param params - studyId and optional entryLimit
 * @param auth - JATOS API auth (token required)
 * @throws JatosApiError / JatosTransportError on JATOS API errors or invalid response
 */
export async function getStudyLog(
  params: GetStudyLogParams,
  auth: JatosAuth
): Promise<GetStudyLogResult> {
  const JATOS_BASE = process.env.JATOS_BASE
  if (!JATOS_BASE || !auth.token) {
    throw new Error("Missing JATOS_BASE or auth.token")
  }

  const { studyId, entryLimit } = params
  const query = new URLSearchParams({ download: "false" })
  if (entryLimit != null) query.set("entryLimit", String(entryLimit))

  let response: Response
  try {
    response = await fetch(
      `${JATOS_BASE}/jatos/api/v1/studies/${encodeURIComponent(String(studyId))}/log?${query}`,
      {
        method: "GET",
        headers: {
          Accept: "application/x-ndjson, application/json",
          Authorization: `Bearer ${auth.token}`,
        },
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
  const items = parseJatosResponse(OPERATION, parseLogBody(text), JatosStudyLogSchema)

  const entries = items.filter((item): item is JatosStudyLogEntry => typeof item !== "string")
  return { entries, truncated: entries.length !== items.length }
}
