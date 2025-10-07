import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetParticipantStudy = z.object({ studyId: z.number() })

export default resolver.pipe(
  resolver.zod(GetParticipantStudy),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId!
    return await db.participantStudy.findUnique({
      where: { userId_studyId: { userId, studyId } },
      select: { id: true, pseudonym: true, jatosRunUrl: true, createdAt: true },
    })
  }
)
