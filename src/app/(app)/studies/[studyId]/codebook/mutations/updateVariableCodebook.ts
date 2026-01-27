import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const UpdateVariableCodebook = z.object({
  studyId: z.number(),
  variables: z.array(
    z.object({
      id: z.number(),
      description: z.string().nullable(),
      personalData: z.boolean(),
    })
  ),
})

// Server-side helper for RSCs
export async function updateVariableCodebookRsc(input: {
  studyId: number
  variables: Array<{
    id: number
    description: string | null
    personalData: boolean
  }>
}) {
  await verifyResearcherStudyAccess(input.studyId)

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

  // Verify all variables belong to the approved extraction snapshot
  const variableIds = input.variables.map((v) => v.id)
  const existingVariables = await db.studyVariable.findMany({
    where: {
      id: { in: variableIds },
      extractionSnapshotId: latestUpload.approvedExtractionId,
    },
  })

  if (existingVariables.length !== input.variables.length) {
    throw new Error("One or more variables do not belong to this study.")
  }

  // Update each variable
  await Promise.all(
    input.variables.map((v) =>
      db.studyVariable.update({
        where: { id: v.id },
        data: {
          description: v.description,
          personalData: v.personalData,
        },
      })
    )
  )

  // Mark step5 as completed if all variables have descriptions
  const allVariables = await db.studyVariable.findMany({
    where: { extractionSnapshotId: latestUpload.approvedExtractionId },
  })

  const allHaveDescriptions = allVariables.every(
    (v) => v.description && v.description.trim() !== ""
  )

  if (allHaveDescriptions && allVariables.length > 0) {
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
  async (input) => {
    return updateVariableCodebookRsc(input)
  }
)
