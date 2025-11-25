import { resolver } from "@blitzjs/rpc"
import db from "db"
import { getBlitzContext } from "@/src/app/blitz-server"
import { z } from "zod"

const SyncStudyVariables = z.object({
  studyId: z.number(),
  variables: z.array(
    z.object({
      name: z.string(),
      label: z.string().optional(),
      type: z.string().optional(),
      example: z.string().optional(),
    })
  ),
})

// Server-side helper for RSCs
export async function syncStudyVariablesRsc(input: {
  studyId: number
  variables: Array<{
    name: string
    label?: string
    type?: string
    example?: string
  }>
}) {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  // Verify the user is a researcher on this study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId: input.studyId, userId: session.userId },
  })

  if (!researcher) {
    throw new Error("You are not authorized to sync variables for this study.")
  }

  // Upsert each variable
  const results = await Promise.all(
    input.variables.map((v) =>
      db.studyVariable.upsert({
        where: { studyId_name: { studyId: input.studyId, name: v.name } },
        create: { studyId: input.studyId, ...v },
        update: v,
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
