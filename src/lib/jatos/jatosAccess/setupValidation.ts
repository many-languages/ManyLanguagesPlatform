import db from "db"
import { checkJatosStudyExistsAdmin } from "../provisioning/checkJatosStudyExistsAdmin"
import { ensureResearcherJatosMember } from "../provisioning/ensureResearcherJatosMember"
import { getResultsMetadata } from "../client/getResultsMetadata"
import { hasParticipantResponses } from "../utils/studyHasParticipantResponses"
import { getTokenForResearcher, getTokenForStudyService } from "../tokenBroker"
import {
  assertResearcherCanAccessStudy,
  getLatestStudyJatosInfo,
  getJatosResponseCheckErrorDetail,
} from "./core"
import type { JatosStudyResult } from "@/src/types/jatos"

export async function checkJatosStudyUuidForSetup({
  studyId,
  userId,
  jatosStudyUuid,
  mode,
}: {
  studyId: number
  userId: number
  jatosStudyUuid: string
  mode: "create" | "update"
}): Promise<{
  success: boolean
  error?: string
  existsOnJatos?: boolean
  needsNewUuid?: boolean
}> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  await assertResearcherCanAccessStudy({ studyId, userId })

  const trimmed = jatosStudyUuid.trim()
  if (!trimmed || !UUID_REGEX.test(trimmed)) {
    return { success: false, error: "Invalid or missing JATOS study UUID in the .jzip file." }
  }

  const existingStudy = await db.study.findFirst({
    where: {
      jatosStudyUUID: trimmed,
      id: { not: studyId },
    },
    select: { id: true },
  })

  if (existingStudy) {
    // UUID collides with a different app study (e.g. a shared example
    // template) — not a real conflict. Skip the existsOnJatos/mode checks
    // below since they'd apply to the UUID we're about to discard; the
    // caller mints a fresh one and uploads with that instead.
    return { success: true, needsNewUuid: true }
  }

  let existsOnJatos = false
  try {
    const result = await checkJatosStudyExistsAdmin(trimmed)
    existsOnJatos = result.exists
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      success: false,
      error: `Failed to verify JATOS study on the server: ${message}`,
    }
  }

  if (mode === "create" && existsOnJatos) {
    return {
      success: false,
      error: "This JATOS study already exists on the server. Please create a new study.",
    }
  }

  if (mode === "update" && !existsOnJatos) {
    return {
      success: false,
      error: "This JATOS study was not found on the server. Please re-import it first.",
    }
  }

  if (mode === "update" && existsOnJatos) {
    try {
      const token = await getTokenForResearcher(userId)
      const metadata = await getResultsMetadata({ studyUuids: [trimmed] }, { token })
      const studies =
        (metadata as { data?: Array<{ studyResults?: JatosStudyResult[] }> })?.data ?? []
      const hasResponses = studies.some((s) => hasParticipantResponses(s.studyResults ?? []))
      if (hasResponses) {
        return {
          success: false,
          error:
            "This study already has participant responses. Please create a new study instead of overwriting.",
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return {
        success: false,
        error: `Failed to check for existing responses: ${message}`,
      }
    }
  }

  return { success: true, existsOnJatos }
}

export async function ensureResearcherStudyMembership({
  userId,
  jatosStudyId,
}: {
  userId: number
  jatosStudyId: number
}): Promise<void> {
  await ensureResearcherJatosMember(userId, jatosStudyId)
}

export async function checkStudyParticipantResponsePresence({
  studyId,
}: {
  studyId: number
}): Promise<boolean> {
  const info = await getLatestStudyJatosInfo(studyId)
  if (!info) {
    return false
  }

  try {
    const token = await getTokenForStudyService(info.jatosStudyId)
    const metadata = await getResultsMetadata({ studyIds: [info.jatosStudyId] }, { token })
    const entry =
      metadata.data?.find((data) => data.studyUuid === info.jatosStudyUUID) ??
      metadata.data?.[0] ??
      null
    return hasParticipantResponses(entry?.studyResults ?? [])
  } catch (error) {
    const detail = getJatosResponseCheckErrorDetail(error)
    throw new Error(`Could not verify participant responses. JATOS may be unavailable: ${detail}`)
  }
}
