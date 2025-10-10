import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetStudyResearcher = z.object({ studyId: z.number() })

export default resolver.pipe(
  resolver.zod(GetStudyResearcher),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId!
    return await db.studyResearcher.findUnique({
      where: { studyId_userId: { studyId, userId } },
      select: { id: true, role: true, createdAt: true },
    })
  }
)
