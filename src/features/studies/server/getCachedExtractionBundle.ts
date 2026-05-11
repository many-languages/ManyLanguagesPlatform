import db from "db"
import { extractionBundleCache } from "../domain/setup/extractionBundleCache"
import { buildCacheKey, buildPilotDatasetHash } from "../domain/setup/extractionCache"
import {
  serializeExtractionBundle,
  type SerializedExtractionBundle,
} from "../domain/setup/serializeExtractionBundle"
import { getAllPilotResultsRsc } from "./getAllPilotResults"
import { withStudyAccess } from "./withStudyAccess"

export type GetCachedExtractionBundleResult = {
  bundle: SerializedExtractionBundle | null
}

export async function getCachedExtractionBundleRsc(input: {
  studyId: number
  includeDiagnostics?: boolean
}): Promise<GetCachedExtractionBundleResult> {
  return withStudyAccess(input.studyId, async () => {
    const study = await db.study.findUnique({
      where: { id: input.studyId },
      select: {
        id: true,
        jatosStudyUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    })

    if (!study) {
      throw new Error("Study not found")
    }

    const latestUpload = study.jatosStudyUploads[0] ?? null
    if (!latestUpload) {
      return { bundle: null }
    }

    const includeDiagnostics = input.includeDiagnostics ?? true
    const pilotResults = await getAllPilotResultsRsc(input.studyId)
    if (pilotResults.length === 0) {
      return { bundle: null }
    }

    const runIds = pilotResults.map((result) => result.id).sort((a, b) => a - b)
    const pilotDatasetHash = buildPilotDatasetHash(latestUpload.id, runIds)
    const cacheKey = buildCacheKey({
      scopeId: latestUpload.id,
      pilotDatasetHash,
      includeDiagnostics,
    })

    let bundle = extractionBundleCache.get(cacheKey)
    if (!bundle && !includeDiagnostics) {
      const fallbackKey = buildCacheKey({
        scopeId: latestUpload.id,
        pilotDatasetHash,
        includeDiagnostics: true,
      })
      bundle = extractionBundleCache.get(fallbackKey)
    }

    return {
      bundle: bundle ? serializeExtractionBundle(bundle) : null,
    }
  })
}
