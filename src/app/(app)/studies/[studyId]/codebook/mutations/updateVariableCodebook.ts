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

  // Verify all variables belong to this study
  const variableIds = input.variables.map((v) => v.id)
  const existingVariables = await db.studyVariable.findMany({
    where: {
      id: { in: variableIds },
      studyId: input.studyId,
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

  // Mark step4 as completed if all variables have descriptions
  const allVariables = await db.studyVariable.findMany({
    where: { studyId: input.studyId },
  })

  const allHaveDescriptions = allVariables.every(
    (v) => v.description && v.description.trim() !== ""
  )

  if (allHaveDescriptions && allVariables.length > 0) {
    await db.study.update({
      where: { id: input.studyId },
      data: { step4Completed: true },
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
