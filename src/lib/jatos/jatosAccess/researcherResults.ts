import { logJatosError } from "../logger"
import { getResultsMetadata } from "../client/getResultsMetadata"
import { getResultsData } from "../client/getResultsData"
import { getStudyProperties } from "../client/getStudyProperties"
import { getAssetStructure } from "../client/getAssetStructure"
import { findStudyResultIdByComment } from "../utils/findStudyResultIdByComment"
import {
  extractHtmlFilesFromStructure,
  type AssetNode,
} from "../utils/extractHtmlFilesFromStructure"
import { extractBatchIdFromProperties } from "../utils/extractBatchIdFromProperties"
import { getTokenForResearcher } from "../tokenBroker"
import {
  withResearcherAccess,
  withResearcherToken,
  assertJatosStudyBelongsToStudy,
  assertJatosStudyUuidBelongsToStudy,
  assertStudyUuidsBelongToResearcher,
  getStudyJatosInfo,
  fetchZipParseAndEnrich,
} from "./core"
import type {
  JatosMetadata,
  JatosStudyProperties,
  EnrichedJatosStudyResult,
} from "@/src/types/jatos"

export type DownloadPayload = {
  filename: string
  mimeType: string
  base64: string
}

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
    await withResearcherAccess({ studyId, userId }, async () => {
      // access check already done in withResearcherAccess
    })
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
