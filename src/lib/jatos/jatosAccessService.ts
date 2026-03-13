/**
 * jatosAccessService — use-case API for JATOS operations.
 * Verifies permissions, chooses token, combines client calls.
 * Never calls getAdminToken(); only getTokenForResearcher and getTokenForStudyService.
 */

import db from "db"
import { getTokenForResearcher, getTokenForStudyService } from "./tokenBroker"
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const token = await getTokenForResearcher(userId)
  const params: Record<string, unknown> = {}
  if (studyIds?.length) params.studyIds = studyIds
  if (studyUuids?.length) params.studyUuids = studyUuids
  if (Object.keys(params).length === 0) {
    const info = await getStudyJatosInfo(studyId)
    if (!info) throw new Error("Study does not have JATOS ID")
    params.studyIds = [info.jatosStudyId]
  }
  return getResultsMetadata(params, { token })
}

/**
 * Fetches JATOS results metadata for participant dashboard flows.
 * Uses service account token (validated via first study). Caller must pass jatosStudyIds
 * derived from participations filtered by userId.
 * Returns null on error or when jatosStudyIds is empty.
 */
export async function getResultsMetadataForParticipantDashboard({
  userId: _userId,
  jatosStudyIds,
}: {
  userId: number
  jatosStudyIds: number[]
}): Promise<JatosMetadata | null> {
  if (jatosStudyIds.length === 0) return null
  try {
    const token = await getTokenForStudyService(jatosStudyIds[0])
    return getResultsMetadata({ studyIds: jatosStudyIds }, { token })
  } catch {
    return null
  }
}

/**
 * Fetches JATOS results metadata for researcher dashboard (active studies with response counts).
 * Uses researcher token. studyId is used for access check; studyUuids are the studies to fetch.
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
  } catch {
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
    await assertParticipantCanAccessStudy({ studyId, pseudonym, userId })
    const token = await getTokenForStudyService(jatosStudyId)
    const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
    const resultId = findStudyResultIdByComment(metadata, pseudonym)
    return { success: true, completed: resultId !== null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check completion"
    return { success: false, completed: false, error: message }
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const token = await getTokenForResearcher(userId)
  const uuid = jatosStudyUUID ?? (await getStudyJatosInfo(studyId))?.jatosStudyUUID
  if (!uuid) throw new Error("Study does not have JATOS UUID")
  return getStudyProperties(uuid, { token })
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
  await assertParticipantCanAccessStudy({ studyId, pseudonym, userId })

  const token = await getTokenForStudyService(jatosStudyId)
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
    const { data: arrayBuffer } = await getResultsData({ studyResultIds: resultId }, { token })
    const blob = new Blob([arrayBuffer])
    const files = await parseJatosZip(blob)
    const enriched = matchJatosDataToMetadata(metadata, files)
    enrichedResult = enriched.find((r) => r.id === resultId) ?? null
  } catch (error) {
    console.error("Error fetching enriched result:", error)
    return {
      success: false,
      completed: true,
      error: "Failed to fetch participant results",
    }
  }

  // getResultsData throws on failure; on success always returns { success: true, data, contentType }
  const allResultsResult = await getResultsData({ studyIds: jatosStudyId }, { token })
  const files = await parseJatosZip(allResultsResult.data)
  const allEnrichedResults = matchJatosDataToMetadata(metadata, files)

  return {
    success: true,
    completed: true,
    data: { enrichedResult, allEnrichedResults },
  }
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
  await assertParticipantCanAccessStudy({ studyId, pseudonym: comment, userId })
  const token = await getTokenForStudyService(jatosStudyId)
  const codes = await fetchStudyCodes(
    { studyId: jatosStudyId, type, amount: 1, batchId: jatosBatchId, comment },
    { token }
  )
  if (codes.length === 0) throw new Error("No study code found")
  const runUrl = generateJatosRunUrl(codes[0])
  await onSave(runUrl)
  return runUrl
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const token = await getTokenForResearcher(userId)
  const codes = await fetchStudyCodes(
    { studyId: jatosStudyId, type, amount: 1, batchId: jatosBatchId, comment },
    { token }
  )
  if (codes.length === 0) throw new Error("No study code found")
  const runUrl = generateJatosRunUrl(codes[0])
  await onSave(runUrl)
  return runUrl
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const info = await getStudyJatosInfo(studyId)
  if (!info) throw new Error("Study does not have JATOS ID")

  const token = await getTokenForResearcher(userId)
  const result = await getResultsData({ studyIds: [info.jatosStudyId] }, { token })
  if (!result.success) throw new Error("Failed to fetch results from JATOS")

  const buffer = Buffer.from(result.data)
  const base64 = buffer.toString("base64")
  return {
    filename: `study_${info.jatosStudyId}_results.zip`,
    mimeType: result.contentType || "application/zip",
    base64,
  }
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
  await assertResearcherCanAccessStudy({ studyId, userId })
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const token = await getTokenForResearcher(userId)
  const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
  const result = await getResultsData({ studyIds: [jatosStudyId] }, { token })
  if (!result.success) throw new Error("Failed to fetch results from JATOS")
  const files = await parseJatosZip(result.data)
  return matchJatosDataToMetadata(metadata, files)
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const token = await getTokenForResearcher(userId)
  const response = await getAssetStructure(jatosStudyId, { token })
  const root = (response as { data?: AssetNode })?.data ?? response
  return extractHtmlFilesFromStructure(root as AssetNode)
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
  await assertResearcherCanAccessStudy({ studyId, userId })
  const info = await getStudyJatosInfo(studyId)
  if (!info) throw new Error("Study does not have JATOS ID")

  const token = await getTokenForResearcher(userId)
  const metadata = await getResultsMetadata({ studyIds: [info.jatosStudyId] }, { token })
  const studyResultId = findStudyResultIdByComment(metadata, comment)
  if (!studyResultId) throw new Error(`No result found with comment "${comment}"`)

  const { data: arrayBuffer } = await getResultsData({ studyResultIds: studyResultId }, { token })
  const blob = new Blob([arrayBuffer])
  const files = await parseJatosZip(blob)
  const enriched = matchJatosDataToMetadata(metadata, files)
  const result = enriched.find((r) => r.id === studyResultId)

  return { studyResultId, metadata, enrichedResult: result }
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
  await assertResearcherCanAccessStudy({ studyId, userId })

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
    markerTokens = new Set(latestUpload?.pilotLinks.map((l) => l.markerToken).filter(Boolean) ?? [])
  }

  if (markerTokens.size === 0) return []

  const token = await getTokenForResearcher(userId)
  const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
  const pilotResults =
    metadata.data?.[0]?.studyResults?.filter((result: JatosStudyResult) => {
      const token = extractPilotMarkerToken(result.comment)
      return token ? markerTokens.has(token) : false
    }) || []

  if (pilotResults.length === 0) return []

  const pilotResultIds = pilotResults.map((r: JatosStudyResult) => r.id)
  const { data: arrayBuffer } = await getResultsData({ studyResultIds: pilotResultIds }, { token })
  const blob = new Blob([arrayBuffer])
  const files = await parseJatosZip(blob)
  const allEnriched = matchJatosDataToMetadata(metadata, files)

  return allEnriched
    .filter((r) => {
      const token = extractPilotMarkerToken(r.comment)
      return token ? markerTokens.has(token) : false
    })
    .sort((a, b) => b.id - a.id)
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
  await assertResearcherCanAccessStudy({ studyId, userId })

  let jatosStudyId = jatosStudyIdContext
  if (!jatosStudyId) {
    const info = await getStudyJatosInfo(studyId)
    if (!info) throw new Error("Study does not have JATOS ID")
    jatosStudyId = info.jatosStudyId
  }

  const token = await getTokenForResearcher(userId)
  const metadata = await getResultsMetadata({ studyIds: [jatosStudyId] }, { token })
  const testResult = metadata.data?.[0]?.studyResults?.find(
    (r: JatosStudyResult) => r.id === testResultId && isPilotComment(r.comment)
  )
  if (!testResult) throw new Error("Pilot result not found")

  const { data: arrayBuffer } = await getResultsData({ studyResultIds: testResultId }, { token })
  const blob = new Blob([arrayBuffer])
  const files = await parseJatosZip(blob)
  const enriched = matchJatosDataToMetadata(metadata, files)
  const match = enriched.find((r) => r.id === testResultId)
  if (!match) throw new Error("Failed to load pilot result data")

  return match
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
  await assertResearcherCanAccessStudy({ studyId, userId })

  const pilotLinks = await db.pilotLink.findMany({
    where: { jatosStudyUploadId },
    select: { markerToken: true },
  })
  const markerTokens = new Set(pilotLinks.map((l) => l.markerToken))
  if (markerTokens.size === 0) {
    return { success: true, completed: false }
  }

  const token = await getTokenForResearcher(userId)
  const metadata = await getResultsMetadata({ studyUuids: [jatosStudyUUID] }, { token })

  const completed = checkPilotCompletionFromMetadata(metadata, jatosStudyUUID, markerTokens)
  return { success: true, completed }
}
