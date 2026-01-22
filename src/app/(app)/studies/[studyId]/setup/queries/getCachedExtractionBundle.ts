import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { extractionBundleCache } from "../utils/extractionBundleCache"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { buildCacheKey, buildPilotDatasetHash } from "../utils/extractionCache"
import {
  serializeExtractionBundle,
  type SerializedExtractionBundle,
} from "../utils/serializeExtractionBundle"

const GetCachedExtractionBundle = z.object({
  studyId: z.number(),
  testResultId: z.number(),
  includeDiagnostics: z.boolean().optional().default(true),
})

export type GetCachedExtractionBundleResult = {
  bundle: SerializedExtractionBundle | null
}

// Server-side helper for RSCs
export async function getCachedExtractionBundleRsc(input: {
  studyId: number
  testResultId: number
  includeDiagnostics?: boolean
}): Promise<GetCachedExtractionBundleResult> {
  await verifyResearcherStudyAccess(input.studyId)

  const includeDiagnostics = input.includeDiagnostics ?? true
  const pilotDatasetHash = buildPilotDatasetHash(input.studyId, [input.testResultId])
  const cacheKey = buildCacheKey({
    studyId: input.studyId,
    pilotDatasetHash,
    includeDiagnostics,
  })

  let bundle = extractionBundleCache.get(cacheKey)
  if (!bundle && !includeDiagnostics) {
    const fallbackKey = buildCacheKey({
      studyId: input.studyId,
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
