/**
 * jatosAccessService — JATOS integration / use-case layer.
 *
 * Responsibilities:
 * - JATOS-related operations only (results, properties, study codes, pilot data, etc.)
 * - Token resolution via tokenBroker (getTokenForResearcher, getTokenForStudyService)
 * - JATOS calls via jatosClient (auth-injected transport)
 * - JATOS-related orchestration and DB lookups needed for the use case
 *
 * Does NOT: handle app-level session retrieval or general DB authorization.
 * App code may use withStudyAccess for that; mixed flows (withStudyAccess + jatosAccessService)
 * are acceptable.
 *
 * App code must not bypass this layer: no direct jatosClient or tokenBroker imports.
 * Never calls getAdminToken(); only getTokenForResearcher and getTokenForStudyService.
 */

import db from "db"
import { getTokenForResearcher, getTokenForStudyService } from "./tokenBroker"
import { logJatosError } from "./logger"
import { mapJatosErrorToUserMessage } from "./errors"
import { getResultsMetadata } from "./client/getResultsMetadata"
import { getResultsData } from "./client/getResultsData"
import { getStudyProperties } from "./client/getStudyProperties"
import { getAssetStructure } from "./client/getAssetStructure"
import { fetchStudyCodes } from "./client/fetchStudyCodes"
import { parseJatosZip } from "./parsers/parseJatosZip"
import { matchJatosDataToMetadata } from "./utils/matchJatosDataToMetadata"
import { findStudyResultIdByComment } from "./utils/findStudyResultIdByComment"
import { generateJatosRunUrl } from "./utils/generateJatosRunUrl"
import {
  extractHtmlFilesFromStructure,
  type AssetNode,
} from "./utils/extractHtmlFilesFromStructure"
import { extractBatchIdFromProperties } from "./utils/extractBatchIdFromProperties"
import { checkPilotCompletionFromMetadata } from "./utils/checkPilotCompletion"
import { extractPilotMarkerToken, isPilotComment } from "./utils/pilotComment"
import { ensureResearcherJatosMember } from "./provisioning/ensureResearcherJatosMember"
import { checkJatosStudyExistsAdmin } from "./provisioning/checkJatosStudyExistsAdmin"
import { hasParticipantResponses } from "./utils/studyHasParticipantResponses"
import type {
  JatosMetadata,
  JatosStudyProperties,
  EnrichedJatosStudyResult,
  JatosStudyResult,
} from "@/src/types/jatos"

// --- Internal helpers (not exported) ---

async function assertResearcherCanAccessStudy({
  studyId,
  userId,
}: {
  studyId: number
  userId: number
}): Promise<void> {
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId },
  })
  if (!researcher) {
    throw new Error("You are not authorized to access this study.")
  }
}

async function assertParticipantCanAccessStudy({
  studyId,
  pseudonym,
  userId,
}: {
  studyId: number
  pseudonym: string
  userId: number
}): Promise<void> {
  const participant = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { pseudonym: true },
  })
  if (!participant) {
    throw new Error("Participant not found for this study")
  }
  if (participant.pseudonym !== pseudonym) {
    throw new Error("Pseudonym does not match authenticated user")
  }
}

async function getStudyJatosInfo(studyId: number): Promise<{
  jatosStudyId: number
  jatosStudyUUID: string
} | null> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { jatosStudyId: true },
  })
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { jatosStudyUUID: true },
  })
  if (!upload || !study?.jatosStudyUUID) return null
  return { jatosStudyId: upload.jatosStudyId, jatosStudyUUID: study.jatosStudyUUID }
}

async function withResearcherToken<T>(
  input: { studyId: number; userId: number },
  callback: (ctx: { studyId: number; userId: number; token: string }) => Promise<T>
): Promise<T> {
  await assertResearcherCanAccessStudy(input)
  const token = await getTokenForResearcher(input.userId)
  return callback({ ...input, token })
}

async function withParticipantToken<T>(
  input: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
  },
  callback: (ctx: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    token: string
  }) => Promise<T>
): Promise<T> {
  await assertParticipantCanAccessStudy({
    studyId: input.studyId,
    pseudonym: input.pseudonym,
    userId: input.userId,
  })
  const token = await getTokenForStudyService(input.jatosStudyId)
  return callback({ ...input, token })
}

/**
 * Shared JATOS flow for creating a personal study code and saving the run URL.
 * Access checks and token selection are done by the caller (via withParticipantToken / withResearcherToken).
 */
async function createPersonalStudyCodeInternal(input: {
  token: string
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  const codes = await fetchStudyCodes(
    {
      studyId: input.jatosStudyId,
      type: input.type,
      amount: 1,
      batchId: input.jatosBatchId,
      comment: input.comment,
    },
    { token: input.token }
  )
  if (codes.length === 0) throw new Error("No study code found")
  const runUrl = generateJatosRunUrl(codes[0])
  await input.onSave(runUrl)
  return runUrl
}

/**
 * Fetches ZIP from JATOS, parses it, and enriches with metadata.
 * Caller fetches metadata separately — some callers already have it or need filtered/validated metadata.
 */
async function fetchZipParseAndEnrich(input: {
  metadata: JatosMetadata
  token: string
  getResultsParams: Record<string, unknown>
}): Promise<EnrichedJatosStudyResult[]> {
  const result = await getResultsData(input.getResultsParams, { token: input.token })
  if (!result.success) throw new Error("Failed to fetch results from JATOS")
  const files = await parseJatosZip(result.data)
  return matchJatosDataToMetadata(input.metadata, files)
}

// --- Public use-case methods ---

export async function getResultsMetadataForResearcher({
  studyId,
  userId,
  studyIds,
  studyUuids,
}: {
  studyId: number
  userId: number
  studyIds?: number[]
  studyUuids?: string[]
}) {
  return withResearcherToken({ studyId, userId }, async ({ studyId, token }) => {
    const params: Record<string, unknown> = {}
    if (studyIds?.length) params.studyIds = studyIds
    if (studyUuids?.length) params.studyUuids = studyUuids
    if (Object.keys(params).length === 0) {
      const info = await getStudyJatosInfo(studyId)
      if (!info) throw new Error("Study does not have JATOS ID")
      params.studyIds = [info.jatosStudyId]
    }
    return getResultsMetadata(params, { token })
  })
}

/**
 * Fetches JATOS results metadata for participant dashboard flows.
 * Uses service account token (validated via first study). Caller must pass jatosStudyIds
 * derived from participations filtered by userId.
 * Returns null on error or when jatosStudyIds is empty.
 *
 * Best-effort: logs and returns null on failure.
 */
export async function getResultsMetadataForParticipantDashboard({
  userId,
  jatosStudyIds,
}: {
  userId: number
  jatosStudyIds: number[]
}): Promise<JatosMetadata | null> {
  if (jatosStudyIds.length === 0) return null
  try {
    const token = await getTokenForStudyService(jatosStudyIds[0])
    return getResultsMetadata({ studyIds: jatosStudyIds }, { token })
  } catch (error) {
    logJatosError("[getResultsMetadataForParticipantDashboard] JATOS metadata fetch failed", {
      operation: "getResultsMetadataForParticipantDashboard",
      userId,
      error,
    })
    return null
  }
}

/**
 * Fetches JATOS results metadata for researcher dashboard (active studies with response counts).
 * Uses researcher token. studyId is used for access check; studyUuids are the studies to fetch.
 *
 * Best-effort: logs and returns null on failure.
 */
export async function getResultsMetadataForResearcherDashboard({
  studyId,
  userId,
  studyUuids,
}: {
  studyId: number
  userId: number
  studyUuids: string[]
}): Promise<JatosMetadata | null> {
  if (studyUuids.length === 0) return null
  try {
    return getResultsMetadataForResearcher({ studyId, userId, studyUuids })
  } catch (error) {
    logJatosError("[getResultsMetadataForResearcherDashboard] JATOS metadata fetch failed", {
      operation: "getResultsMetadataForResearcherDashboard",
      studyId,
      userId,
      error,
    })
    return null
  }
}

/**
 * Checks if a participant has completed a study (metadata-only, no ZIP download).
 * Verifies participant access via assertParticipantCanAccessStudy.
 */
export async function checkParticipantCompletionForParticipant({
  studyId,
  pseudonym,
  jatosStudyId,
  userId,
}: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  userId: number
}): Promise<{ success: boolean; completed: boolean; error?: string }> {
  try {
    return await withParticipantToken(
      { studyId, pseudonym, userId, jatosStudyId },
      async ({ jatosStudyId, pseudonym, token }) => {
        const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
        const resultId = findStudyResultIdByComment(metadata, pseudonym)
        return { success: true, completed: resultId !== null }
      }
    )
  } catch (error) {
    return {
      success: false,
      completed: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}

export async function getStudyPropertiesForResearcher({
  studyId,
  userId,
  jatosStudyUUID,
}: {
  studyId: number
  userId: number
  jatosStudyUUID?: string
}): Promise<JatosStudyProperties> {
  return withResearcherToken({ studyId, userId }, async ({ studyId, token }) => {
    const uuid = jatosStudyUUID ?? (await getStudyJatosInfo(studyId))?.jatosStudyUUID
    if (!uuid) throw new Error("Study does not have JATOS UUID")
    return getStudyProperties(uuid, { token })
  })
}

export async function getBatchIdForResearcher({
  studyId,
  userId,
  jatosStudyUUID,
}: {
  studyId: number
  userId: number
  jatosStudyUUID?: string
}): Promise<number | null> {
  const properties = await getStudyPropertiesForResearcher({
    studyId,
    userId,
    jatosStudyUUID,
  })
  return extractBatchIdFromProperties(properties)
}

/**
 * Setup validation: checks JATOS study UUID before import (create or update mode).
 * Uses an admin-backed JATOS existence check internally — app code must call this facade,
 * not provisioning/admin helpers directly.
 *
 * Verifies researcher access, UUID format, DB uniqueness, JATOS existence, and (for update)
 * blocks overwrite when the study has participant responses.
 *
 * Stays in jatosAccessService for now; could move to a dedicated setup service if setup-specific
 * JATOS flows grow.
 */
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
}): Promise<{ ok: boolean; error?: string; existsOnJatos?: boolean }> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  await assertResearcherCanAccessStudy({ studyId, userId })

  const trimmed = jatosStudyUuid.trim()
  if (!trimmed || !UUID_REGEX.test(trimmed)) {
    return { ok: false, error: "Invalid or missing JATOS study UUID in the .jzip file." }
  }

  const existingStudy = await db.study.findFirst({
    where: {
      jatosStudyUUID: trimmed,
      id: { not: studyId },
    },
    select: { id: true, title: true },
  })

  if (existingStudy) {
    return {
      ok: false,
      error: "This JATOS study UUID is already linked to another study.",
    }
  }

  let existsOnJatos = false
  try {
    const result = await checkJatosStudyExistsAdmin(trimmed)
    existsOnJatos = result.exists
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      ok: false,
      error: `Failed to verify JATOS study on the server: ${message}`,
    }
  }

  if (mode === "create" && existsOnJatos) {
    return {
      ok: false,
      error: "This JATOS study already exists on the server. Please create a new study.",
    }
  }

  if (mode === "update" && !existsOnJatos) {
    return {
      ok: false,
      error: "This JATOS study was not found on the server. Please re-import it first.",
    }
  }

  // Block update if study has participant responses (non-pilot, FINISHED)
  if (mode === "update" && existsOnJatos) {
    try {
      const metadata = await getResultsMetadataForResearcher({
        studyId,
        userId,
        studyUuids: [trimmed],
      })
      const studies =
        (metadata as { data?: Array<{ studyResults?: JatosStudyResult[] }> })?.data ?? []
      const hasResponses = studies.some((s) => hasParticipantResponses(s.studyResults ?? []))
      if (hasResponses) {
        return {
          ok: false,
          error:
            "This study already has participant responses. Please create a new study instead of overwriting.",
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return {
        ok: false,
        error: `Failed to check for existing responses: ${message}`,
      }
    }
  }

  return { ok: true, existsOnJatos }
}

/**
 * Ensures a researcher is a member of a JATOS study.
 * Provisions the researcher's JATOS user if needed, then adds them as a study member.
 * Idempotent: safe to call multiple times.
 *
 * Use when a researcher needs JATOS study membership (e.g. after creating a study
 * that already has an upload from re-import).
 */
export async function ensureResearcherStudyMembership({
  userId,
  jatosStudyId,
}: {
  userId: number
  jatosStudyId: number
}): Promise<void> {
  await ensureResearcherJatosMember(userId, jatosStudyId)
}

export async function getParticipantFeedback({
  studyId,
  pseudonym,
  jatosStudyId,
  userId,
}: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  userId: number
}): Promise<{
  success: boolean
  completed: boolean
  data?: {
    enrichedResult: EnrichedJatosStudyResult | null
    allEnrichedResults: EnrichedJatosStudyResult[]
  }
  error?: string
}> {
  return withParticipantToken(
    { studyId, pseudonym, userId, jatosStudyId },
    async ({ jatosStudyId, pseudonym, token }) => {
      const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
      const resultId = findStudyResultIdByComment(metadata, pseudonym)
      const completed = resultId !== null

      if (!completed) {
        return {
          success: true,
          completed: false,
          data: { enrichedResult: null, allEnrichedResults: [] },
        }
      }

      let enrichedResult: EnrichedJatosStudyResult | null = null
      try {
        const enriched = await fetchZipParseAndEnrich({
          metadata,
          token,
          getResultsParams: { studyResultIds: resultId },
        })
        enrichedResult = enriched.find((r) => r.id === resultId) ?? null
      } catch (error) {
        logJatosError("Error fetching enriched result for getParticipantFeedback", {
          operation: "getParticipantFeedback",
          error,
        })
        return {
          success: false,
          completed: true,
          error: mapJatosErrorToUserMessage(error),
        }
      }

      const allEnrichedResults = await fetchZipParseAndEnrich({
        metadata,
        token,
        getResultsParams: { studyIds: jatosStudyId },
      })

      return {
        success: true,
        completed: true,
        data: { enrichedResult, allEnrichedResults },
      }
    }
  )
}

export async function createPersonalStudyCodeForParticipant({
  studyId,
  userId,
  jatosStudyId,
  jatosBatchId,
  type,
  comment,
  onSave,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  return withParticipantToken(
    { studyId, pseudonym: comment, userId, jatosStudyId },
    async ({ jatosStudyId, token }) =>
      createPersonalStudyCodeInternal({
        token,
        jatosStudyId,
        jatosBatchId,
        type,
        comment,
        onSave,
      })
  )
}

export async function createPersonalStudyCodeForResearcher({
  studyId,
  userId,
  jatosStudyId,
  jatosBatchId,
  type,
  comment,
  onSave,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  return withResearcherToken({ studyId, userId }, async ({ token }) =>
    createPersonalStudyCodeInternal({
      token,
      jatosStudyId,
      jatosBatchId,
      type,
      comment,
      onSave,
    })
  )
}

export type DownloadPayload = {
  filename: string
  mimeType: string
  base64: string
}

export async function downloadAllResultsForResearcher({
  studyId,
  userId,
}: {
  studyId: number
  userId: number
}): Promise<DownloadPayload> {
  return withResearcherToken({ studyId, userId }, async ({ studyId, token }) => {
    const info = await getStudyJatosInfo(studyId)
    if (!info) throw new Error("Study does not have JATOS ID")

    const result = await getResultsData({ studyIds: [info.jatosStudyId] }, { token })
    if (!result.success) throw new Error("Failed to fetch results from JATOS")

    const buffer = Buffer.from(result.data)
    const base64 = buffer.toString("base64")
    return {
      filename: `study_${info.jatosStudyId}_results.zip`,
      mimeType: result.contentType || "application/zip",
      base64,
    }
  })
}

export async function getGeneralLinksForResearcher({
  studyId,
  userId,
  jatosStudyId,
  participants,
  type = "gs",
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  participants: { id: number; pseudonym: string }[]
  type?: "gs" | "gm"
}): Promise<{
  type: string
  studyId: number
  baseCode: string
  baseRunUrl: string
  links: { participantId: number; pseudonym: string; runUrl: string }[]
}> {
  return withResearcherToken({ studyId, userId }, async ({ token }) => {
    const codes = await fetchStudyCodes({ studyId: jatosStudyId, type, amount: 1 }, { token })
    if (codes.length === 0) throw new Error("No general study code found")

    const baseRunUrl = generateJatosRunUrl(codes[0])
    const links = participants.map((p) => ({
      participantId: p.id,
      pseudonym: p.pseudonym,
      runUrl: `${baseRunUrl}?participantId=${encodeURIComponent(p.pseudonym)}`,
    }))

    return {
      type,
      studyId,
      baseCode: codes[0],
      baseRunUrl,
      links,
    }
  })
}

export async function getEnrichedResultsForResearcher({
  studyId,
  userId,
  jatosStudyId,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
}): Promise<EnrichedJatosStudyResult[]> {
  return withResearcherToken({ studyId, userId }, async ({ token }) => {
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
    return fetchZipParseAndEnrich({
      metadata,
      token,
      getResultsParams: { studyIds: [jatosStudyId] },
    })
  })
}

export async function getHtmlFilesForResearcher({
  studyId,
  userId,
  jatosStudyId,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
}): Promise<{ label: string; value: string }[]> {
  return withResearcherToken({ studyId, userId }, async ({ token }) => {
    const response = await getAssetStructure(jatosStudyId, { token })
    const root = (response as { data?: AssetNode })?.data ?? response
    return extractHtmlFilesFromStructure(root as AssetNode)
  })
}

export async function getStudyDataByCommentForResearcher({
  studyId,
  userId,
  comment,
}: {
  studyId: number
  userId: number
  comment: string
}) {
  return withResearcherToken({ studyId, userId }, async ({ studyId, token }) => {
    const info = await getStudyJatosInfo(studyId)
    if (!info) throw new Error("Study does not have JATOS ID")

    const metadata = await getResultsMetadata({ studyIds: [info.jatosStudyId] }, { token })
    const studyResultId = findStudyResultIdByComment(metadata, comment)
    if (!studyResultId) throw new Error(`No result found with comment "${comment}"`)

    const enriched = await fetchZipParseAndEnrich({
      metadata,
      token,
      getResultsParams: { studyResultIds: studyResultId },
    })
    const result = enriched.find((r) => r.id === studyResultId)

    return { studyResultId, metadata, enrichedResult: result }
  })
}

export interface PilotResultsContext {
  jatosStudyId: number
  markerTokens: string[]
}

export async function getAllPilotResultsForResearcher({
  studyId,
  userId,
  context,
}: {
  studyId: number
  userId: number
  context?: PilotResultsContext
}): Promise<EnrichedJatosStudyResult[]> {
  return withResearcherToken({ studyId, userId }, async ({ studyId, token }) => {
    let jatosStudyId: number
    let markerTokens: Set<string>

    if (context) {
      jatosStudyId = context.jatosStudyId
      markerTokens = new Set(context.markerTokens)
    } else {
      const study = await db.study.findUnique({
        where: { id: studyId },
        select: {
          jatosStudyUploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              jatosStudyId: true,
              pilotLinks: { select: { markerToken: true } },
            },
          },
        },
      })
      const latestUpload = study?.jatosStudyUploads[0] ?? null
      const foundJatosStudyId = latestUpload?.jatosStudyId ?? null
      if (!foundJatosStudyId) throw new Error("Study does not have JATOS ID")
      jatosStudyId = foundJatosStudyId
      markerTokens = new Set(
        latestUpload?.pilotLinks.map((l) => l.markerToken).filter(Boolean) ?? []
      )
    }

    if (markerTokens.size === 0) return []

    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
    const pilotResults =
      metadata.data?.[0]?.studyResults?.filter((result: JatosStudyResult) => {
        const markerToken = extractPilotMarkerToken(result.comment)
        return markerToken ? markerTokens.has(markerToken) : false
      }) || []

    if (pilotResults.length === 0) return []

    const pilotResultIds = pilotResults.map((r: JatosStudyResult) => r.id)
    const allEnriched = await fetchZipParseAndEnrich({
      metadata,
      token,
      getResultsParams: { studyResultIds: pilotResultIds },
    })

    return allEnriched
      .filter((r) => {
        const markerToken = extractPilotMarkerToken(r.comment)
        return markerToken ? markerTokens.has(markerToken) : false
      })
      .sort((a, b) => b.id - a.id)
  })
}

export async function getPilotResultByIdForResearcher({
  studyId,
  userId,
  testResultId,
  jatosStudyIdContext,
}: {
  studyId: number
  userId: number
  testResultId: number
  jatosStudyIdContext?: number
}): Promise<EnrichedJatosStudyResult> {
  return withResearcherToken({ studyId, userId }, async ({ studyId, token }) => {
    let jatosStudyId = jatosStudyIdContext
    if (!jatosStudyId) {
      const info = await getStudyJatosInfo(studyId)
      if (!info) throw new Error("Study does not have JATOS ID")
      jatosStudyId = info.jatosStudyId
    }

    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
    const testResult = metadata.data?.[0]?.studyResults?.find(
      (r: JatosStudyResult) => r.id === testResultId && isPilotComment(r.comment)
    )
    if (!testResult) throw new Error("Pilot result not found")

    const enriched = await fetchZipParseAndEnrich({
      metadata,
      token,
      getResultsParams: { studyResultIds: testResultId },
    })
    const match = enriched.find((r) => r.id === testResultId)
    if (!match) throw new Error("Failed to load pilot result data")

    return match
  })
}

export async function checkPilotStatusForResearcher({
  studyId,
  userId,
  jatosStudyUUID,
  jatosStudyUploadId,
}: {
  studyId: number
  userId: number
  jatosStudyUUID: string
  jatosStudyUploadId: number
}): Promise<{ success: boolean; completed: boolean | null; error?: string }> {
  return withResearcherToken({ studyId, userId }, async ({ token }) => {
    const pilotLinks = await db.pilotLink.findMany({
      where: { jatosStudyUploadId },
      select: { markerToken: true },
    })
    const markerTokens = new Set(pilotLinks.map((l) => l.markerToken))
    if (markerTokens.size === 0) {
      return { success: true, completed: false }
    }

    const metadata = await getResultsMetadata({ studyUuids: [jatosStudyUUID] }, { token })

    const completed = checkPilotCompletionFromMetadata(metadata, jatosStudyUUID, markerTokens)
    return { success: true, completed }
  })
}
