import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

const SyncStudyVariables = z.object({
  studyId: z.number(),
  variables: z.array(
    z.object({
      variableKey: z.string(),
      variableName: z.string(),
      type: z.string(),
      examples: z
        .array(
          z.object({
            value: z.string(),
            sourcePath: z.string(),
          })
        )
        .optional(),
    })
  ),
})

// Server-side helper for RSCs
export async function syncStudyVariablesRsc(input: {
  studyId: number
  variables: Array<{
    variableKey: string
    variableName: string
    type: string
    examples?: Array<{
      value: string
      sourcePath: string
    }>
  }>
}) {
  await verifyResearcherStudyAccess(input.studyId)

  // Upsert each variable
  const results = await Promise.all(
    input.variables.map((v) =>
      db.studyVariable.upsert({
        where: { studyId_variableKey: { studyId: input.studyId, variableKey: v.variableKey } },
        create: { studyId: input.studyId, ...v },
        update: {
          variableName: v.variableName,
          type: v.type,
          examples: v.examples,
        },
      })
    )
  )
  return results
}

// Blitz RPC for client usage
export default resolver.pipe(
  resolver.zod(SyncStudyVariables),
  resolver.authorize("RESEARCHER"),
  async (input) => {
    return syncStudyVariablesRsc(input)
  }
)
