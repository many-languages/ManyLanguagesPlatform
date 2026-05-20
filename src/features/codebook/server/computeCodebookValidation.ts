import db, { Prisma } from "db"
import { findWinningGroupKey } from "../domain/codebookGroups"

type DbClient = Prisma.TransactionClient | typeof db

export async function computeCodebookValidation(
  studyId: number,
  client: DbClient = db
): Promise<{
  status: "VALID" | "INVALID" | "NO_CODEBOOK" | "NO_EXTRACTION"
  missingKeys: string[]
  extraKeys: string[]
}> {
  const latestUpload = await client.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { approvedExtractionId: true },
  })

  if (!latestUpload?.approvedExtractionId) {
    return {
      status: "NO_EXTRACTION",
      missingKeys: [],
      extraKeys: [],
    }
  }

  const codebook = await client.codebook.findUnique({
    where: { studyId },
    select: { id: true },
  })

  if (!codebook) {
    return {
      status: "NO_CODEBOOK",
      missingKeys: [],
      extraKeys: [],
    }
  }

  const [entries, groups, extractionVariables] = await Promise.all([
    client.codebookEntry.findMany({
      where: { codebookId: codebook.id },
      select: { variableKey: true },
    }),
    client.codebookGroup.findMany({
      where: { codebookId: codebook.id },
      select: { groupKey: true },
    }),
    client.studyVariable.findMany({
      where: { extractionSnapshotId: latestUpload.approvedExtractionId },
      select: { variableKey: true, dslKey: true },
    }),
  ])

  const entryKeys = new Set(entries.map((e) => e.variableKey))
  const extractionKeys = new Set(extractionVariables.map((v) => v.variableKey))

  const groupKeys = groups.map((g) => g.groupKey)
  const isGroupCovered = (dslKey: string) => findWinningGroupKey(dslKey, groupKeys) !== undefined

  const missingKeys = extractionVariables
    .filter((v) => !entryKeys.has(v.variableKey) && !isGroupCovered(v.dslKey))
    .map((v) => v.variableKey)

  const extraKeys = Array.from(entryKeys).filter((key) => !extractionKeys.has(key))

  return {
    status: missingKeys.length === 0 ? "VALID" : "INVALID",
    missingKeys,
    extraKeys,
  }
}
