import type { Prisma } from "db"

export async function validateCodebookAgainstExtraction(
  tx: Prisma.TransactionClient,
  args: {
    studyId: number
    extractionSnapshotId: number
    extractorVersion: string
  }
): Promise<{
  status: "VALID" | "INVALID"
  missingKeys: string[]
  extraKeys: string[]
} | null> {
  const codebook = await tx.codebook.findUnique({
    where: { studyId: args.studyId },
    select: { id: true },
  })

  if (!codebook) {
    return null
  }

  const [entries, extractionVariables] = await Promise.all([
    tx.codebookEntry.findMany({
      where: { codebookId: codebook.id },
      select: { variableKey: true },
    }),
    tx.studyVariable.findMany({
      where: { extractionSnapshotId: args.extractionSnapshotId },
      select: { variableKey: true },
    }),
  ])

  const entryKeys = new Set(entries.map((entry) => entry.variableKey))
  const extractionKeys = new Set(extractionVariables.map((v) => v.variableKey))

  const missingKeys = Array.from(extractionKeys).filter((key) => !entryKeys.has(key))
  const extraKeys = Array.from(entryKeys).filter((key) => !extractionKeys.has(key))

  const status = missingKeys.length === 0 && extraKeys.length === 0 ? "VALID" : "INVALID"

  await tx.codebook.update({
    where: { id: codebook.id },
    data: {
      validationStatus: status,
      validatedExtractionId: args.extractionSnapshotId,
      validatedAt: new Date(),
      missingKeys,
      extraKeys,
      extractorVersion: args.extractorVersion,
    },
  })

  return { status, missingKeys, extraKeys }
}
