import db from "db"
import { withStudyWriteAccess } from "@/src/features/studies/services"
import {
  assertMutuallyExclusiveGroupKeys,
  variableHasDescriptionCoverage,
} from "../domain/codebookGroups"
import { computeCodebookValidation } from "./computeCodebookValidation"
import { getPersonalDataViolationsForPersistedTemplate } from "@/src/features/feedback"

export type UpdateVariableCodebookInput = {
  studyId: number
  variables: Array<{
    variableKey: string
    variableName: string
    dslKey: string
    description: string | null
    personalData: boolean
  }>
  groups: Array<{
    groupKey: string
    description: string | null
    personalData: boolean
  }>
}

export type UpdateVariableCodebookResult = {
  success: true
  feedbackPersonalDataConflict: boolean
}

export async function updateVariableCodebookRsc(
  input: UpdateVariableCodebookInput
): Promise<UpdateVariableCodebookResult> {
  return withStudyWriteAccess(input.studyId, async (_sId, _uId) => {
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

    const inputGroupKeys = new Set(input.groups.map((g) => g.groupKey))
    assertMutuallyExclusiveGroupKeys(input.groups.map((g) => g.groupKey))

    const codebookValidation = await db.$transaction(async (tx) => {
      await tx.codebookEntry.deleteMany({
        where: {
          codebookId: codebook.id,
          variableKey: { notIn: Array.from(inputVariableKeys) },
        },
      })

      await tx.codebookGroup.deleteMany({
        where: {
          codebookId: codebook.id,
          groupKey: { notIn: Array.from(inputGroupKeys) },
        },
      })

      await Promise.all([
        ...input.variables.map((v) =>
          tx.codebookEntry.upsert({
            where: {
              codebookId_variableKey: {
                codebookId: codebook.id,
                variableKey: v.variableKey,
              },
            },
            update: {
              variableName: v.variableName,
              dslKey: v.dslKey,
              description: v.description,
              personalData: v.personalData,
            },
            create: {
              codebookId: codebook.id,
              variableKey: v.variableKey,
              variableName: v.variableName,
              dslKey: v.dslKey,
              description: v.description,
              personalData: v.personalData,
            },
          })
        ),
        ...input.groups.map((g) =>
          tx.codebookGroup.upsert({
            where: {
              codebookId_groupKey: {
                codebookId: codebook.id,
                groupKey: g.groupKey,
              },
            },
            update: {
              description: g.description,
              personalData: g.personalData,
            },
            create: {
              codebookId: codebook.id,
              groupKey: g.groupKey,
              description: g.description,
              personalData: g.personalData,
            },
          })
        ),
      ])

      return computeCodebookValidation(input.studyId, tx)
    })

    const allHaveDescriptions = input.variables.every((v) =>
      variableHasDescriptionCoverage(v.dslKey, v.description, input.groups)
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
