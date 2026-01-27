import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { extractionBundleCache } from "../utils/extractionBundleCache"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import db from "db"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { DEFAULT_EXTRACTION_CONFIG } from "../../variables/types"
import { extractVariableBundleFromResults } from "../../variables/utils/extractVariable"
import { buildCacheKey, buildPilotDatasetHash } from "../utils/extractionCache"
import {
  serializeExtractionBundle,
  type SerializedExtractionBundle,
} from "../utils/serializeExtractionBundle"

const RunExtraction = z.object({
  studyId: z.number(),
  includeDiagnostics: z.boolean().optional().default(true),
})

export type RunExtractionResult = {
  bundle: SerializedExtractionBundle
}

// Server-side helper for RSCs
export async function runExtractionRsc(input: {
  studyId: number
  includeDiagnostics?: boolean
}): Promise<RunExtractionResult> {
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
  if (!latestUpload) throw new Error("No JATOS upload found for this study")

  const includeDiagnostics = input.includeDiagnostics ?? true
  const pilotResults = await getAllPilotResultsRsc(input.studyId)
  if (pilotResults.length === 0) {
    throw new Error("No pilot results found for this study upload")
  }

  const runIds = pilotResults.map((result) => result.id).sort((a, b) => a - b)
  const pilotDatasetHash = buildPilotDatasetHash(latestUpload.id, runIds)
  const cacheKey = buildCacheKey({
    scopeId: latestUpload.id,
    pilotDatasetHash,
    includeDiagnostics,
  })

  let bundle = extractionBundleCache.get(cacheKey)
  if (!bundle) {
    bundle = extractVariableBundleFromResults(pilotResults, DEFAULT_EXTRACTION_CONFIG, {
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
