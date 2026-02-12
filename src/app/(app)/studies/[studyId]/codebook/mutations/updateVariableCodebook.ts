import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

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

// Server-side helper for RSCs
export async function updateVariableCodebookRsc(
  input: {
    studyId: number
    variables: Array<{
      variableKey: string
      variableName: string
      description: string | null
      personalData: boolean
    }>
  },
  ctx: any
) {
  await verifyResearcherStudyAccess(input.studyId, ctx)

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
  if (!latestUpload?.approvedExtractionId) {
    throw new Error("No approved extraction found for this study.")
  }

  const extractionVariables = await db.studyVariable.findMany({
    where: {
      extractionSnapshotId: latestUpload.approvedExtractionId,
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

  await db.$transaction(async (tx) => {
    await tx.codebook.update({
      where: { id: codebook.id },
      data: {
        validationStatus: "NEEDS_REVIEW",
        validatedExtractionId: null,
        validatedAt: null,
        missingKeys: null,
        extraKeys: null,
        extractorVersion: null,
      },
    })

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
  })

  const allHaveDescriptions = input.variables.every(
    (v) => v.description && v.description.trim() !== ""
  )

  if (allHaveDescriptions && input.variables.length > 0) {
    await db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { step5Completed: true },
    })
  }

  return { success: true }
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(UpdateVariableCodebook),
  resolver.authorize("RESEARCHER"),
  async (input, ctx) => {
    return updateVariableCodebookRsc(input, ctx)
  }
)
