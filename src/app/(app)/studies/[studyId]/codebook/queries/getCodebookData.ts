import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { cache } from "react"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const GetCodebookData = z.object({
  studyId: z.number(),
})

// Server-side helper for RSCs
export const getCodebookDataRsc = cache(async (studyId: number) => {
  await verifyResearcherStudyAccess(studyId, undefined as any)

  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          approvedExtractionId: true,
          approvedExtraction: {
            select: { id: true, approvedAt: true },
          },
        },
      },
    },
  })

  const latestUpload = study?.jatosStudyUploads[0] ?? null
  const approvedExtractionId = latestUpload?.approvedExtractionId ?? null
  const approvedExtractionApprovedAt = latestUpload?.approvedExtraction?.approvedAt ?? null

  const variables = approvedExtractionId
    ? await db.studyVariable.findMany({
        where: { extractionSnapshotId: approvedExtractionId },
        select: {
          id: true,
          variableKey: true,
          variableName: true,
          type: true,
          examples: true,
        },
        orderBy: { variableName: "asc" },
      })
    : []

  const codebook = await db.codebook.findUnique({
    where: { studyId },
    select: {
      id: true,
      validationStatus: true,
      validatedExtractionId: true,
      validatedAt: true,
      missingKeys: true,
      extraKeys: true,
      updatedAt: true,
    },
  })

  const entries = codebook
    ? await db.codebookEntry.findMany({
        where: { codebookId: codebook.id },
        select: {
          variableKey: true,
          description: true,
          personalData: true,
        },
      })
    : []

  const entryByKey = new Map(entries.map((entry) => [entry.variableKey, entry]))

  return {
    variables: variables.map((v) => ({
      id: v.id,
      variableKey: v.variableKey,
      variableName: v.variableName,
      type: v.type,
      examples: v.examples,
      description: entryByKey.get(v.variableKey)?.description ?? null,
      personalData: entryByKey.get(v.variableKey)?.personalData ?? false,
    })),
    codebook: codebook ?? null,
    approvedExtractionId,
    approvedExtractionApprovedAt,
  }
})

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(GetCodebookData),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }) => {
    return getCodebookDataRsc(studyId)
  }
)
