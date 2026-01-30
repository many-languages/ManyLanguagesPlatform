import db from "db"

export async function getVariablesByExtraction(extractionSnapshotId: number) {
  const variables = await db.studyVariable.findMany({
    where: { extractionSnapshotId },
    select: {
      id: true,
      variableKey: true,
      variableName: true,
      type: true,
      examples: true,
    },
    orderBy: { variableName: "asc" },
  })

  // We need to fetch descriptions from the codebook if possible, but that requires studyId.
  // For now, let's keep it simple and just return the variables.
  // The original getCodebookData also merged in codebook descriptions.
  // If we need that, we might need to pass the codebook extraction or do a separate fetch content.
  // Based on the 'extract' nature of this helper, let's stick to just the variable definitions for now.

  return variables.map((v) => ({
    ...v,
    examples: (v.examples as { value: string; sourcePath: string }[] | null) ?? [],
  }))
}
