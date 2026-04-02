import db, { Prisma } from "db"

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

  const [entries, extractionVariables] = await Promise.all([
    client.codebookEntry.findMany({
      where: { codebookId: codebook.id },
      select: { variableKey: true },
    }),
    client.studyVariable.findMany({
      where: { extractionSnapshotId: latestUpload.approvedExtractionId },
      select: { variableKey: true },
    }),
  ])

  const entryKeys = new Set(entries.map((entry) => entry.variableKey))
  const extractionKeys = new Set(extractionVariables.map((v) => v.variableKey))

  const missingKeys = Array.from(extractionKeys).filter((key) => !entryKeys.has(key))
  const extraKeys = Array.from(entryKeys).filter((key) => !extractionKeys.has(key))

  return {
    status: missingKeys.length === 0 ? "VALID" : "INVALID",
    missingKeys,
    extraKeys,
  }
}
