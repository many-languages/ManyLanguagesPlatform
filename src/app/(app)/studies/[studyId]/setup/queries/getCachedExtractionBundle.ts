import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { extractionBundleCache } from "../utils/extractionBundleCache"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { buildCacheKey, buildPilotDatasetHash } from "../utils/extractionCache"
import {
  serializeExtractionBundle,
  type SerializedExtractionBundle,
} from "../utils/serializeExtractionBundle"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import db from "db"

const GetCachedExtractionBundle = z.object({
  studyId: z.number(),
  includeDiagnostics: z.boolean().optional().default(true),
})

export type GetCachedExtractionBundleResult = {
  bundle: SerializedExtractionBundle | null
}

// Server-side helper for RSCs
export async function getCachedExtractionBundleRsc(input: {
  studyId: number
  includeDiagnostics?: boolean
}): Promise<GetCachedExtractionBundleResult> {
  await verifyResearcherStudyAccess(input.studyId)

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
  if (!study) throw new Error("Study not found")
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
  return { bundle: bundle ? serializeExtractionBundle(bundle) : null }
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetCachedExtractionBundle),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return getCachedExtractionBundleRsc(input)
  }
)
