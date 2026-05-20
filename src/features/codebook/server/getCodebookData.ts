import db from "db"
import { cache } from "react"
import { withStudyAccess } from "@/src/features/studies/services"
import { findWinningGroup } from "../domain/codebookGroups"
import { computeCodebookValidation } from "./computeCodebookValidation"

export const fetchCodebookMergedVariablesForStudy = cache(async (studyId: number) => {
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
          dslKey: true,
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
      updatedAt: true,
    },
  })

  const [entries, groups] = codebook
    ? await Promise.all([
        db.codebookEntry.findMany({
          where: { codebookId: codebook.id },
          select: { variableKey: true, description: true, personalData: true },
        }),
        db.codebookGroup.findMany({
          where: { codebookId: codebook.id },
          select: { groupKey: true, description: true, personalData: true },
        }),
      ])
    : [[], []]

  const entryByKey = new Map(entries.map((entry) => [entry.variableKey, entry]))

  const codebookValidation = await computeCodebookValidation(studyId)

  return {
    variables: variables.map((v) => {
      const entry = entryByKey.get(v.variableKey)
      const group = findWinningGroup(v.dslKey, groups)
      return {
        id: v.id,
        variableKey: v.variableKey,
        variableName: v.variableName,
        dslKey: v.dslKey,
        type: v.type,
        examples: v.examples,
        description: entry?.description ?? group?.description ?? null,
        personalData: entry?.personalData ?? group?.personalData ?? false,
      }
    }),
    groups,
    codebook: codebook
      ? {
          ...codebook,
          ...codebookValidation,
        }
      : null,
    approvedExtractionId,
    approvedExtractionApprovedAt,
  }
})

export type CodebookMergedVariablesPayload = Awaited<
  ReturnType<typeof fetchCodebookMergedVariablesForStudy>
>

export const getCodebookDataRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async () => {
    return fetchCodebookMergedVariablesForStudy(studyId)
  })
})
