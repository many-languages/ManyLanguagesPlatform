import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db, { Prisma } from "db"
import { getPilotResultByIdRsc } from "../../utils/getPilotResultById"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { DEFAULT_EXTRACTION_CONFIG } from "../../variables/types"
import { extractVariableBundle } from "../../variables/utils/extractVariable"
import { extractionBundleCache } from "../utils/extractionBundleCache"
import {
  EXTRACTOR_VERSION,
  buildCacheKey,
  buildPilotDatasetHash,
  hashJson,
} from "../utils/extractionCache"

const ApproveExtraction = z.object({
  studyId: z.number(),
  testResultId: z.number(),
})

function buildExtractionOutputHash(bundle: ReturnType<typeof extractVariableBundle>): string {
  const variables = bundle.variables
    .map((variable) => ({
      variableKey: variable.variableKey,
      variableName: variable.variableName,
      type: variable.type,
      occurrences: variable.occurrences,
      dataStructure: variable.dataStructure,
      componentIds: [...variable.componentIds].sort((a, b) => a - b),
      flags: [...variable.flags].sort(),
      depth: variable.depth,
      isTopLevel: variable.isTopLevel,
    }))
    .sort((a, b) => a.variableKey.localeCompare(b.variableKey))
  return hashJson({ variables })
}

// Server-side helper for RSCs
export async function approveExtractionRsc(input: {
  studyId: number
  testResultId: number
}): Promise<{ extractionSnapshotId: number; variableCount: number }> {
  await verifyResearcherStudyAccess(input.studyId)

  const study = await db.study.findUnique({
    where: { id: input.studyId },
    select: { id: true, setupRevision: true },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  const testResult = await getPilotResultByIdRsc(input.studyId, input.testResultId)
  const runIds = [testResult.id]
  const pilotDatasetHash = buildPilotDatasetHash(input.studyId, runIds)

  const cacheKey = buildCacheKey({
    studyId: input.studyId,
    pilotDatasetHash,
    includeDiagnostics: true,
  })

  let bundle = extractionBundleCache.get(cacheKey)
  if (!bundle) {
    bundle = extractVariableBundle(testResult, DEFAULT_EXTRACTION_CONFIG)
    extractionBundleCache.set(cacheKey, bundle)
  }

  const extractionConfigHash = hashJson(DEFAULT_EXTRACTION_CONFIG)
  const outputHash = buildExtractionOutputHash(bundle)
  const structureSummary = {
    componentCount: testResult.componentResults.length,
    runCount: 1,
  }
  const aggregates = {
    variableCount: bundle.variables.length,
    observationCount: bundle.observations.length,
  }

  const result = await db.$transaction(async (tx) => {
    const pilotDatasetSnapshot = await tx.pilotDatasetSnapshot.upsert({
      where: {
        studyId_setupRevision_pilotDatasetHash: {
          studyId: input.studyId,
          setupRevision: study.setupRevision,
          pilotDatasetHash,
        },
      },
      create: {
        studyId: input.studyId,
        setupRevision: study.setupRevision,
        pilotDatasetHash,
        pilotRunCount: runIds.length,
        pilotRunIds: runIds,
        markerTokens: undefined,
      },
      update: {
        pilotRunCount: runIds.length,
        pilotRunIds: runIds,
        markerTokens: undefined,
      },
    })

    const existingSnapshot = await tx.extractionSnapshot.findFirst({
      where: {
        studyId: input.studyId,
        setupRevision: study.setupRevision,
        status: "APPROVED",
        pilotDatasetSnapshotId: pilotDatasetSnapshot.id,
        extractorVersion: EXTRACTOR_VERSION,
        extractorConfigHash: extractionConfigHash,
        outputHash,
      },
      select: { id: true },
    })

    const extractionSnapshot =
      existingSnapshot ??
      (await tx.extractionSnapshot.create({
        data: {
          studyId: input.studyId,
          setupRevision: study.setupRevision,
          status: "APPROVED",
          approvedAt: new Date(),
          pilotDatasetSnapshotId: pilotDatasetSnapshot.id,
          extractorVersion: EXTRACTOR_VERSION,
          extractorConfigHash: extractionConfigHash,
          outputHash,
          structureSummary,
          aggregates,
        },
        select: { id: true },
      }))

    if (!existingSnapshot && bundle.variables.length > 0) {
      await tx.studyVariable.createMany({
        data: bundle.variables.map((v) => ({
          extractionSnapshotId: extractionSnapshot.id,
          variableKey: v.variableKey,
          variableName: v.variableName,
          type: v.type,
          examples: v.examples as Prisma.InputJsonValue,
        })),
      })
    }

    await tx.study.update({
      where: { id: input.studyId },
      data: {
        approvedExtractionId: extractionSnapshot.id,
        step4Completed: true,
      },
    })

    return { extractionSnapshotId: extractionSnapshot.id, variableCount: bundle.variables.length }
  })

  return result
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(ApproveExtraction),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return approveExtractionRsc(input)
  }
)
