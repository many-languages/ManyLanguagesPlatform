import db from "db"
import { resolver } from "@blitzjs/rpc"
import { z } from "zod"

const GetStudy = z.object({
  id: z.number(),
})

export default resolver.pipe(resolver.zod(GetStudy), resolver.authorize(), async ({ id }) => {
  const study = await db.study.findUnique({
    where: { id },
    include: {
      researchers: {
        include: { user: true },
      },
      participations: {
        include: { participant: true },
      },
    },
  })

  if (!study) throw new Error("Study not found")

  return study
})
