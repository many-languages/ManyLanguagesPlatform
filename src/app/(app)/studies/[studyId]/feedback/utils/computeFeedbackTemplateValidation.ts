import db, { Prisma } from "db"
import { extractRequiredVariableNames } from "./requiredKeys"

type DbClient = Prisma.TransactionClient | typeof db

export async function computeFeedbackTemplateValidation(
  studyId: number,
  client: DbClient = db
): Promise<{
  status: "VALID" | "INVALID" | "NO_TEMPLATE" | "NO_EXTRACTION"
  missingVariableNames: string[]
  extraVariableNames: string[]
}> {
  const latestUpload = await client.jatosStudyUpload.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { approvedExtractionId: true },
  })

  if (!latestUpload?.approvedExtractionId) {
    return {
      status: "NO_EXTRACTION",
      missingVariableNames: [],
      extraVariableNames: [],
    }
  }

  const template = await client.feedbackTemplate.findUnique({
    where: { studyId },
    select: { content: true, requiredVariableNames: true },
  })

  if (!template) {
    return {
      status: "NO_TEMPLATE",
      missingVariableNames: [],
      extraVariableNames: [],
    }
  }

  const requiredVariableNames =
    Array.isArray(template.requiredVariableNames) &&
    template.requiredVariableNames.every((item) => typeof item === "string")
      ? (template.requiredVariableNames as string[])
      : extractRequiredVariableNames(template.content.trim())

  const variables = await client.studyVariable.findMany({
    where: { extractionSnapshotId: latestUpload.approvedExtractionId },
    select: { variableName: true },
  })

  const availableNames = new Set(variables.map((v) => v.variableName))
  const requiredSet = new Set(requiredVariableNames)

  const missingVariableNames = requiredVariableNames.filter((name) => !availableNames.has(name))
  const extraVariableNames = variables
    .map((v) => v.variableName)
    .filter((name) => !requiredSet.has(name))

  return {
    status: missingVariableNames.length === 0 ? "VALID" : "INVALID",
    missingVariableNames,
    extraVariableNames,
  }
}
