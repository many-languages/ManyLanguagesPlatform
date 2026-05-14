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
 *
 * --- Method error-handling patterns ---
 *
 * 1. Throws: Primary flows (setup, export, data fetch). Caller must handle failures.
 *    Examples: getResultsMetadataForResearcher, getStudyPropertiesForResearcher,
 *    createPersonalStudyCode*, downloadAllResultsForResearcher.
 *
 * 2. Result object or discriminated union: UI needs structured outcome without throwing.
 *    Examples: checkParticipantCompletionForParticipant ({ success, error? }),
 *    getParticipantFeedback (GetParticipantFeedbackResult),
 *    checkJatosStudyUuidForSetup, checkPilotStatusForResearcher.
 *
 * 3. Best-effort null: Dashboards/aggregation. Logs and returns null on failure;
 *    partial data loss is acceptable.
 *    Examples: getResultsMetadataForParticipantDashboard, getResultsMetadataForResearcherDashboard.
 */

import db from "db"
import { getTokenForResearcher, getTokenForStudyService } from "./tokenBroker"
import { logJatosError } from "./logger"
import {
  JatosTransportError,
  mapJatosErrorToUserMessage,
  USER_MESSAGE_PARTICIPANT_FEEDBACK_ENRICHMENT_MISSING,
} from "./errors"
import type { GetParticipantFeedbackResult } from "./participantFeedbackTypes"

export type { GetParticipantFeedbackResult } from "./participantFeedbackTypes"
import { getResultsMetadata } from "./client/getResultsMetadata"
import { getResultsData } from "./client/getResultsData"
import { getStudyProperties } from "./client/getStudyProperties"
import { getAssetStructure } from "./client/getAssetStructure"
import { fetchStudyCodes } from "./client/fetchStudyCodes"
import { parseJatosZip } from "./parsers/parseJatosZip"
import { matchJatosDataToMetadata } from "./utils/matchJatosDataToMetadata"
import {
  findLatestStudyResultSelectionByComment,
  findStudyResultIdByComment,
} from "./utils/findStudyResultIdByComment"
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
import { computeAggregatedAcrossStatsForTemplate } from "@/src/features/feedback/domain/computeAggregatedAcrossStats"
import { templateUsesStatAcross } from "@/src/features/feedback/domain/statAcrossKeys"

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
  participantStudyId,
}: {
  studyId: number
  pseudonym: string
  userId: number
  participantStudyId?: number
}): Promise<void> {
  const participant = await db.participantStudy.findUnique({
    where: { userId_studyId: { userId, studyId } },
    select: { id: true, pseudonym: true },
  })
  if (!participant) {
    throw new Error("Participant not found for this study")
  }
  if (participantStudyId != null && participant.id !== participantStudyId) {
    throw new Error("Participant record does not match authenticated study membership")
  }
  if (participant.pseudonym !== pseudonym) {
    throw new Error("Pseudonym does not match authenticated user")
  }
}

async function assertJatosStudyBelongsToStudy({
  studyId,
  jatosStudyId,
}: {
  studyId: number
  jatosStudyId: number
}): Promise<void> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId, jatosStudyId },
    select: { id: true },
  })
  if (!upload) {
    throw new Error("JATOS study does not belong to this app study.")
  }
}

async function assertJatosStudyUuidBelongsToStudy({
  studyId,
  jatosStudyUUID,
}: {
  studyId: number
  jatosStudyUUID: string
}): Promise<void> {
  const study = await db.study.findFirst({
    where: { id: studyId, jatosStudyUUID },
    select: { id: true },
  })
  if (!study) {
    throw new Error("JATOS study UUID does not belong to this app study.")
  }
}

async function assertJatosUploadBelongsToStudy({
  studyId,
  jatosStudyUploadId,
  jatosStudyId,
}: {
  studyId: number
  jatosStudyUploadId: number
  jatosStudyId?: number
}): Promise<void> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: {
      id: jatosStudyUploadId,
      studyId,
      ...(jatosStudyId == null ? {} : { jatosStudyId }),
    },
    select: { id: true },
  })
  if (!upload) {
    throw new Error("JATOS upload does not belong to this app study.")
  }
}

async function assertJatosStudyIdsBelongToParticipant({
  userId,
  jatosStudyIds,
}: {
  userId: number
  jatosStudyIds: number[]
}): Promise<void> {
  const uniqueIds = [...new Set(jatosStudyIds)]
  if (uniqueIds.length === 0) return

  const participations = await db.participantStudy.findMany({
    where: {
      userId,
      study: {
        jatosStudyUploads: {
          some: { jatosStudyId: { in: uniqueIds } },
        },
      },
    },
    select: {
      study: {
        select: {
          jatosStudyUploads: {
            where: { jatosStudyId: { in: uniqueIds } },
            select: { jatosStudyId: true },
          },
        },
      },
    },
  })

  const authorizedIds = new Set(
    participations.flatMap((participation) =>
      participation.study.jatosStudyUploads.map((upload) => upload.jatosStudyId)
    )
  )
  const unauthorizedId = uniqueIds.find((id) => !authorizedIds.has(id))
  if (unauthorizedId != null) {
    throw new Error("JATOS study does not belong to an authenticated participant study.")
  }
}

async function assertStudyUuidsBelongToResearcher({
  userId,
  studyUuids,
}: {
  userId: number
  studyUuids: string[]
}): Promise<void> {
  const uniqueUuids = [...new Set(studyUuids.map((uuid) => uuid.trim()).filter(Boolean))]
  if (uniqueUuids.length === 0) return

  const studies = await db.study.findMany({
    where: {
      jatosStudyUUID: { in: uniqueUuids },
      researchers: { some: { userId } },
    },
    select: { jatosStudyUUID: true },
  })

  const authorizedUuids = new Set(
    studies.map((study) => study.jatosStudyUUID).filter((uuid): uuid is string => Boolean(uuid))
  )
  const unauthorizedUuid = uniqueUuids.find((uuid) => !authorizedUuids.has(uuid))
  if (unauthorizedUuid) {
    throw new Error("JATOS study UUID does not belong to an authorized researcher study.")
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

async function getLatestStudyJatosInfo(studyId: number): Promise<{
  jatosStudyId: number
  jatosStudyUUID: string
} | null> {
  const upload = await db.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: { jatosStudyUUID: true },
  })
  const jatosStudyUUID = study?.jatosStudyUUID?.trim()
  if (!upload || !jatosStudyUUID) return null
  return { jatosStudyId: upload.jatosStudyId, jatosStudyUUID }
}

function getJatosResponseCheckErrorDetail(error: unknown): string {
  if (error instanceof JatosTransportError) return error.message
  if (error instanceof Error) return error.message
  return "Unknown error"
}

async function withResearcherToken<T>(
  input: { studyId: number; userId: number },
  callback: (ctx: { studyId: number; userId: number; token: string }) => Promise<T>
): Promise<T> {
  return withResearcherAccess(input, async ({ studyId, userId }) => {
    const token = await getTokenForResearcher(userId)
    return callback({ studyId, userId, token })
  })
}

async function withResearcherAccess<T>(
  input: { studyId: number; userId: number },
  callback: (ctx: { studyId: number; userId: number }) => Promise<T>
): Promise<T> {
  await assertResearcherCanAccessStudy(input)
  return callback(input)
}

/**
 * Uses service account (VIEWER) for participant read flows.
 * Do not use for study code creation — use withParticipantAccessAndResearcherToken.
 */
async function withParticipantViewerToken<T>(
  input: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    participantStudyId?: number
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
    participantStudyId: input.participantStudyId,
  })
  await assertJatosStudyBelongsToStudy({
    studyId: input.studyId,
    jatosStudyId: input.jatosStudyId,
  })
  const token = await getTokenForStudyService(input.jatosStudyId)
  return callback({ ...input, token })
}

/** Explicit role priority for researcher selection (do not trust enum order). */
const RESEARCHER_ROLE_PRIORITY: Record<string, number> = {
  PI: 0,
  COLLABORATOR: 1,
  VIEWER: 2,
}

/**
 * Returns the userId of an eligible researcher for study-level JATOS operations
 * that require USER capability (e.g. study code creation).
 *
 * Selection rule (deterministic):
 * 1. PI first, then COLLABORATOR, then VIEWER (ResearcherRole)
 * 2. Within each role: earliest createdAt
 * 3. Tie-breaker: smallest userId
 *
 * @throws if study has no researchers
 */
async function getEligibleResearcherForStudy(studyId: number): Promise<number> {
  const researchers = await db.studyResearcher.findMany({
    where: { studyId },
    orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
    take: 20,
    select: { userId: true, role: true, createdAt: true },
  })
  if (researchers.length === 0) {
    throw new Error("Study has no researchers; cannot create participant study code.")
  }
  const sorted = [...researchers].sort((a, b) => {
    const pa = RESEARCHER_ROLE_PRIORITY[a.role] ?? 999
    const pb = RESEARCHER_ROLE_PRIORITY[b.role] ?? 999
    if (pa !== pb) return pa - pb
    const ca = a.createdAt.getTime()
    const cb = b.createdAt.getTime()
    if (ca !== cb) return ca - cb
    return a.userId - b.userId
  })
  return sorted[0]!.userId
}

/**
 * For participant-authenticated operations that require JATOS USER capability
 * (e.g. study code creation). Participant access is validated; the operation
 * is executed using a researcher's token because the service account is VIEWER.
 *
 * POLICY: This is intentional delegated researcher authority for participant
 * code creation — JATOS requires USER for POST /studyCodes. Do not use for
 * read flows; use withParticipantViewerToken instead.
 */
async function withParticipantAccessAndResearcherToken<T>(
  input: {
    studyId: number
    pseudonym: string
    userId: number
    jatosStudyId: number
    participantStudyId?: number
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
    participantStudyId: input.participantStudyId,
  })
  await assertJatosStudyBelongsToStudy({
    studyId: input.studyId,
    jatosStudyId: input.jatosStudyId,
  })
  const researcherUserId = await getEligibleResearcherForStudy(input.studyId)
  const token = await getTokenForResearcher(researcherUserId)
  return callback({ ...input, token })
}

/**
 * Shared JATOS flow for creating a personal study code and saving the run URL.
 * Access checks and token selection are done by the caller (via withParticipantAccessAndResearcherToken
 * or withResearcherToken — never withParticipantViewerToken, which cannot create codes).
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
  return withResearcherAccess({ studyId, userId }, async ({ studyId, userId }) => {
    const params: Record<string, unknown> = {}
    if (studyIds?.length) {
      await Promise.all(
        studyIds.map((jatosStudyId) => assertJatosStudyBelongsToStudy({ studyId, jatosStudyId }))
      )
      params.studyIds = studyIds
    }
    if (studyUuids?.length) {
      await assertStudyUuidsBelongToResearcher({ userId, studyUuids })
      params.studyUuids = studyUuids
    }
    if (Object.keys(params).length === 0) {
      const info = await getStudyJatosInfo(studyId)
      if (!info) throw new Error("Study does not have JATOS ID")
      params.studyIds = [info.jatosStudyId]
    }
    const token = await getTokenForResearcher(userId)
    return getResultsMetadata(params, { token })
  })
}

/**
 * Fetches JATOS results metadata for participant dashboard flows.
 * Uses service account token (validated via first study). Returns null on error or when
 * jatosStudyIds is empty.
 *
 * Best-effort: logs and returns null on failure.
 *
 * Access control: verifies every JATOS study ID against the authenticated participant's
 * app-level participations before resolving a service token.
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
    await assertJatosStudyIdsBelongToParticipant({ userId, jatosStudyIds })
    const token = await getTokenForStudyService(jatosStudyIds[0])
    return await getResultsMetadata({ studyIds: jatosStudyIds }, { token })
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
    await assertResearcherCanAccessStudy({ studyId, userId })
    await assertStudyUuidsBelongToResearcher({ userId, studyUuids })
    const token = await getTokenForResearcher(userId)
    return await getResultsMetadata({ studyUuids }, { token })
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
 * Platform lifecycle/admin check: whether a study has any non-pilot FINISHED JATOS results.
 *
 * Uses the study service account token because archive/delete safety checks are platform-level
 * decisions and do not naturally belong to a researcher or participant session. Throws when
 * JATOS cannot be checked so destructive lifecycle paths can fail closed.
 */
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
    return await withParticipantViewerToken(
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
  return withResearcherAccess({ studyId, userId }, async ({ studyId, userId }) => {
    const uuid = jatosStudyUUID ?? (await getStudyJatosInfo(studyId))?.jatosStudyUUID
    if (!uuid) throw new Error("Study does not have JATOS UUID")
    if (jatosStudyUUID) {
      await assertJatosStudyUuidBelongsToStudy({ studyId, jatosStudyUUID })
    }
    const token = await getTokenForResearcher(userId)
    return getStudyProperties(uuid, { token })
  })
}

/**
 * Returns the JATOS batch ID for a study, or null if the study has no batch configured.
 * null is a valid state (not an error) — e.g. single-worker studies often have no batch.
 */
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
}): Promise<{ success: boolean; error?: string; existsOnJatos?: boolean }> {
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
    select: { id: true, title: true },
  })

  if (existingStudy) {
    return {
      success: false,
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

  // Block update if study has participant responses (non-pilot, FINISHED)
  if (mode === "update" && existsOnJatos) {
    try {
      // Setup validation intentionally checks a candidate UUID before it may be
      // linked to the app study, so it cannot use the normal UUID binding path.
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

/**
 * Ensures a researcher is a member of a JATOS study.
 * Provisions the researcher's JATOS user if needed, then adds them as a study member.
 * Idempotent: safe to call multiple times.
 *
 * Use when a researcher needs JATOS study membership (e.g. after creating a study
 * that already has an upload from re-import).
 *
 * Access control: Does NOT verify that userId is authorized for jatosStudyId. Caller
 * must only invoke from a trusted context where the user is already authorized (e.g.
 * createStudy, where the user is the PI). Calling with arbitrary userId/jatosStudyId
 * could add a researcher to a JATOS study they should not access.
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
  participantStudyId,
  userId,
  templateContent,
  variableKeysAllowlist,
}: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  participantStudyId?: number
  userId: number
  /** Used to decide whether cohort aggregation runs (stat:…:across) and to compute aggregates server-side only. */
  templateContent: string
  /** `StudyVariable.variableKey` values for extraction narrowing; from key-resolution helpers in feedback utils. */
  variableKeysAllowlist?: string[]
}): Promise<GetParticipantFeedbackResult> {
  return withParticipantViewerToken(
    { studyId, pseudonym, userId, jatosStudyId, participantStudyId },
    async ({ jatosStudyId, pseudonym, token }) => {
      try {
        const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
        const { resultId, matchCount, selectedEndDate } = findLatestStudyResultSelectionByComment(
          metadata,
          pseudonym
        )

        if (resultId === null) {
          return { kind: "not_completed" }
        }

        const needsCohortForAcross = templateUsesStatAcross(templateContent)

        if (!needsCohortForAcross) {
          const enriched = await fetchZipParseAndEnrich({
            metadata,
            token,
            getResultsParams: { studyResultIds: resultId },
          })
          const enrichedResult = enriched.find((r) => r.id === resultId) ?? null
          if (!enrichedResult) {
            return {
              kind: "failed",
              error: USER_MESSAGE_PARTICIPANT_FEEDBACK_ENRICHMENT_MISSING,
            }
          }
          return {
            kind: "loaded",
            enrichedResult,
            matchingResponseCount: matchCount,
            selectedResponseEndDate: selectedEndDate,
          }
        }

        const allEnrichedResults = await fetchZipParseAndEnrich({
          metadata,
          token,
          getResultsParams: { studyIds: jatosStudyId },
        })
        const enrichedResult = allEnrichedResults.find((r) => r.id === resultId) ?? null
        if (!enrichedResult) {
          return {
            kind: "failed",
            error: USER_MESSAGE_PARTICIPANT_FEEDBACK_ENRICHMENT_MISSING,
          }
        }
        const aggregatedAcrossStats = computeAggregatedAcrossStatsForTemplate(
          allEnrichedResults,
          templateContent,
          variableKeysAllowlist
        )
        return {
          kind: "loaded",
          enrichedResult,
          aggregatedAcrossStats,
          matchingResponseCount: matchCount,
          selectedResponseEndDate: selectedEndDate,
        }
      } catch (error) {
        logJatosError("Error fetching enriched result for getParticipantFeedback", {
          operation: "getParticipantFeedback",
          error,
        })
        return { kind: "failed", error: mapJatosErrorToUserMessage(error) }
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
  participantStudyId,
  onSave,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  participantStudyId?: number
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  return withParticipantAccessAndResearcherToken(
    { studyId, pseudonym: comment, userId, jatosStudyId, participantStudyId },
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
  jatosStudyUploadId,
  jatosBatchId,
  type,
  comment,
  onSave,
}: {
  studyId: number
  userId: number
  jatosStudyId: number
  jatosStudyUploadId?: number
  jatosBatchId?: number
  type: "ps" | "pm"
  comment: string
  onSave: (runUrl: string) => Promise<void>
}): Promise<string> {
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    if (jatosStudyUploadId != null) {
      await assertJatosUploadBelongsToStudy({ studyId, jatosStudyUploadId, jatosStudyId })
    } else {
      await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    }

    const token = await getTokenForResearcher(userId)
    return createPersonalStudyCodeInternal({
      token,
      jatosStudyId,
      jatosBatchId,
      type,
      comment,
      onSave,
    })
  })
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
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    const token = await getTokenForResearcher(userId)
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
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    const token = await getTokenForResearcher(userId)
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
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    const token = await getTokenForResearcher(userId)
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
  return withResearcherAccess({ studyId, userId }, async ({ studyId, userId }) => {
    let jatosStudyId: number
    let markerTokens: Set<string>

    if (context) {
      jatosStudyId = context.jatosStudyId
      await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
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

    const token = await getTokenForResearcher(userId)
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
  return withResearcherAccess({ studyId, userId }, async ({ studyId, userId }) => {
    let jatosStudyId = jatosStudyIdContext
    if (!jatosStudyId) {
      const info = await getStudyJatosInfo(studyId)
      if (!info) throw new Error("Study does not have JATOS ID")
      jatosStudyId = info.jatosStudyId
    } else {
      await assertJatosStudyBelongsToStudy({ studyId, jatosStudyId })
    }

    const token = await getTokenForResearcher(userId)
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
  return withResearcherAccess({ studyId, userId }, async ({ userId }) => {
    await assertJatosStudyUuidBelongsToStudy({ studyId, jatosStudyUUID })
    await assertJatosUploadBelongsToStudy({ studyId, jatosStudyUploadId })
    const token = await getTokenForResearcher(userId)
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
