import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db, { Prisma } from "db"
import { getAllPilotResultsRsc } from "../../utils/getAllPilotResults"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { DEFAULT_EXTRACTION_CONFIG } from "../../variables/types"
import { extractVariableBundleFromResults } from "../../variables/utils/extractVariable"
import { extractionBundleCache } from "../utils/extractionBundleCache"
import {
  EXTRACTOR_VERSION,
  buildCacheKey,
  buildPilotDatasetHash,
  hashJson,
} from "../utils/extractionCache"
import { validateFeedbackTemplateAgainstExtraction } from "../../feedback/utils/validateTemplateAgainstExtraction"

const ApproveExtraction = z.object({
  studyId: z.number(),
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
}): Promise<{ extractionSnapshotId: number; variableCount: number }> {
  await verifyResearcherStudyAccess(input.studyId)

  const study = await db.study.findUnique({
    where: { id: input.studyId },
    select: {
      id: true,
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          pilotLinks: { select: { markerToken: true } },
        },
      },
    },
  })

  if (!study) {
    throw new Error("Study not found")
  }

  const latestUpload = study.jatosStudyUploads[0] ?? null
  if (!latestUpload) {
    throw new Error("No JATOS upload found for this study")
  }

  const pilotResults = await getAllPilotResultsRsc(input.studyId)
  if (pilotResults.length === 0) {
    throw new Error("No pilot results found for this study upload")
  }

  const runIds = pilotResults.map((result) => result.id).sort((a, b) => a - b)
  const pilotDatasetHash = buildPilotDatasetHash(latestUpload.id, runIds)

  const cacheKey = buildCacheKey({
    scopeId: latestUpload.id,
    pilotDatasetHash,
    includeDiagnostics: true,
  })

  let bundle = extractionBundleCache.get(cacheKey)
  if (!bundle) {
    bundle = extractVariableBundleFromResults(pilotResults, DEFAULT_EXTRACTION_CONFIG)
    extractionBundleCache.set(cacheKey, bundle)
  }

  const extractionConfigHash = hashJson(DEFAULT_EXTRACTION_CONFIG)
  const outputHash = buildExtractionOutputHash(bundle)
  const structureSummary = {
    componentCount: pilotResults.reduce(
      (count, result) => count + result.componentResults.length,
      0
    ),
    runCount: runIds.length,
  }
  const aggregates = {
    variableCount: bundle.variables.length,
    observationCount: bundle.observations.length,
  }

  const result = await db.$transaction(async (tx) => {
    const pilotDatasetSnapshot = await tx.pilotDatasetSnapshot.upsert({
      where: {
        jatosStudyUploadId_pilotDatasetHash: {
          jatosStudyUploadId: latestUpload.id,
          pilotDatasetHash,
        },
      },
      create: {
        jatosStudyUploadId: latestUpload.id,
        pilotDatasetHash,
        pilotRunCount: runIds.length,
        pilotRunIds: runIds,
        markerTokens: latestUpload.pilotLinks.map((link) => link.markerToken),
      },
      update: {
        pilotRunCount: runIds.length,
        pilotRunIds: runIds,
        markerTokens: latestUpload.pilotLinks.map((link) => link.markerToken),
      },
    })

    const existingSnapshot = await tx.extractionSnapshot.findFirst({
      where: {
        jatosStudyUploadId: latestUpload.id,
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
          jatosStudyUploadId: latestUpload.id,
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

    await tx.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: {
        approvedExtractionId: extractionSnapshot.id,
        step4Completed: true,
      },
    })

    const feedbackValidation = await validateFeedbackTemplateAgainstExtraction(tx, {
      studyId: input.studyId,
      extractionSnapshotId: extractionSnapshot.id,
      extractorVersion: EXTRACTOR_VERSION,
    })

    if (feedbackValidation?.status === "INVALID") {
      await tx.jatosStudyUpload.update({
        where: { id: latestUpload.id },
        data: { step6Completed: false },
      })
    }

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
