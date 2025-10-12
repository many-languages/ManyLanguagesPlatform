import { resolver } from "@blitzjs/rpc"
import db from "db"
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

export default resolver.pipe(
  resolver.zod(SyncStudyVariables),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, variables }) => {
    // Upsert each variable
    const results = await Promise.all(
      variables.map((v) =>
        db.studyVariable.upsert({
          where: { studyId_name: { studyId, name: v.name } },
          create: { studyId, ...v },
          update: v,
        })
      )
    )
    return results
  }
)
