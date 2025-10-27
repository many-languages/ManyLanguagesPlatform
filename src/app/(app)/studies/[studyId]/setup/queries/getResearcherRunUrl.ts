import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetResearcherRunUrl = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(GetResearcherRunUrl),
  resolver.authorize("RESEARCHER"),
  async ({ studyId }, ctx) => {
    if (!ctx.session.userId) throw new Error("Not authenticated")

    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId: ctx.session.userId },
      select: { id: true, jatosRunUrl: true },
    })

    if (!researcher) throw new Error("You are not assigned to this study")

    return researcher
  }
)
