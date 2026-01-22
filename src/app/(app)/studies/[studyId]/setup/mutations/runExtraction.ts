import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { extractionBundleCache } from "../utils/extractionBundleCache"
import { getPilotResultByIdRsc } from "../../utils/getPilotResultById"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { DEFAULT_EXTRACTION_CONFIG } from "../../variables/types"
import { extractVariableBundle } from "../../variables/utils/extractVariable"
import { buildCacheKey, buildPilotDatasetHash } from "../utils/extractionCache"
import {
  serializeExtractionBundle,
  type SerializedExtractionBundle,
} from "../utils/serializeExtractionBundle"

const RunExtraction = z.object({
  studyId: z.number(),
  testResultId: z.number(),
  includeDiagnostics: z.boolean().optional().default(true),
})

export type RunExtractionResult = {
  bundle: SerializedExtractionBundle
}

// Server-side helper for RSCs
export async function runExtractionRsc(input: {
  studyId: number
  testResultId: number
  includeDiagnostics?: boolean
}): Promise<RunExtractionResult> {
  await verifyResearcherStudyAccess(input.studyId)

  const includeDiagnostics = input.includeDiagnostics ?? true
  const testResult = await getPilotResultByIdRsc(input.studyId, input.testResultId)
  const pilotDatasetHash = buildPilotDatasetHash(input.studyId, [testResult.id])
  const cacheKey = buildCacheKey({
    studyId: input.studyId,
    pilotDatasetHash,
    includeDiagnostics,
  })

  let bundle = extractionBundleCache.get(cacheKey)
  if (!bundle) {
    bundle = extractVariableBundle(testResult, DEFAULT_EXTRACTION_CONFIG, {
      diagnostics: includeDiagnostics,
    })
    extractionBundleCache.set(cacheKey, bundle)
  }

  return { bundle: serializeExtractionBundle(bundle) }
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(RunExtraction),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return runExtractionRsc(input)
  }
)
