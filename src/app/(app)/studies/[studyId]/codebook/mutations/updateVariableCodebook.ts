import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { withStudyAccess } from "../../utils/withStudyAccess"
import { validateCodebookAgainstExtraction } from "../utils/validateCodebookAgainstExtraction"
import { EXTRACTOR_VERSION } from "../../setup/utils/extractionCache"
import { getPersonalDataViolationsForPersistedTemplate } from "../../feedback/utils/feedbackTemplatePersonalDataViolations"

const UpdateVariableCodebook = z.object({
  studyId: z.number(),
  variables: z.array(
    z.object({
      variableKey: z.string(),
      variableName: z.string(),
      description: z.string().nullable(),
      personalData: z.boolean(),
    })
  ),
})

export type UpdateVariableCodebookResult = {
  success: true
  feedbackPersonalDataConflict: boolean
}

// Server-side helper for RSCs
export async function updateVariableCodebookRsc(input: {
  studyId: number
  variables: Array<{
    variableKey: string
    variableName: string
    description: string | null
    personalData: boolean
  }>
}): Promise<UpdateVariableCodebookResult> {
  return withStudyAccess(input.studyId, async (_sId, _uId) => {
    const study = await db.study.findUnique({
      where: { id: input.studyId },
      select: {
        jatosStudyUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, approvedExtractionId: true },
        },
      },
    })

    const latestUpload = study?.jatosStudyUploads[0] ?? null
    const approvedExtractionId = latestUpload?.approvedExtractionId
    if (!latestUpload || !approvedExtractionId) {
      throw new Error("No approved extraction found for this study.")
    }

    const extractionVariables = await db.studyVariable.findMany({
      where: {
        extractionSnapshotId: approvedExtractionId,
      },
      select: { variableKey: true },
    })

    const extractionVariableKeys = new Set(extractionVariables.map((v) => v.variableKey))
    const inputVariableKeys = new Set(input.variables.map((v) => v.variableKey))

    const allKeysValid = input.variables.every((v) => extractionVariableKeys.has(v.variableKey))
    if (!allKeysValid) {
      throw new Error("One or more variables do not belong to this study.")
    }

    const codebook =
      (await db.codebook.findUnique({
        where: { studyId: input.studyId },
        select: { id: true },
      })) ??
      (await db.codebook.create({
        data: { studyId: input.studyId },
        select: { id: true },
      }))

    const codebookValidation = await db.$transaction(async (tx) => {
      await tx.codebookEntry.deleteMany({
        where: {
          codebookId: codebook.id,
          variableKey: { notIn: Array.from(inputVariableKeys) },
        },
      })

      await Promise.all(
        input.variables.map((v) =>
          tx.codebookEntry.upsert({
            where: {
              codebookId_variableKey: {
                codebookId: codebook.id,
                variableKey: v.variableKey,
              },
            },
            update: {
              variableName: v.variableName,
              description: v.description,
              personalData: v.personalData,
            },
            create: {
              codebookId: codebook.id,
              variableKey: v.variableKey,
              variableName: v.variableName,
              description: v.description,
              personalData: v.personalData,
            },
          })
        )
      )

      return validateCodebookAgainstExtraction(tx, {
        studyId: input.studyId,
        extractionSnapshotId: approvedExtractionId,
        extractorVersion: EXTRACTOR_VERSION,
      })
    })

    const allHaveDescriptions = input.variables.every(
      (v) => v.description && v.description.trim() !== ""
    )

    const step5Completed =
      codebookValidation?.status !== "INVALID" && allHaveDescriptions && input.variables.length > 0

    await db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { step5Completed },
    })

    let feedbackPersonalDataConflict = false
    const template = await db.feedbackTemplate.findFirst({
      where: { studyId: input.studyId },
      orderBy: { updatedAt: "desc" },
      select: { content: true, requiredVariableNames: true },
    })
    if (template) {
      try {
        const violations = await getPersonalDataViolationsForPersistedTemplate(
          input.studyId,
          template
        )
        feedbackPersonalDataConflict = violations.length > 0
      } catch (error) {
        console.error("Codebook save: feedback personal-data check failed", error)
      }
    }

    return { success: true as const, feedbackPersonalDataConflict }
  })
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(UpdateVariableCodebook),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return updateVariableCodebookRsc(input)
  }
)
