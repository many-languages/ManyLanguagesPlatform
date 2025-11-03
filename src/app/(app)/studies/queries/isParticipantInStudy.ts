import db from "db"
import { resolver } from "@blitzjs/rpc"
import { IsParticipantInStudy } from "../validations"

export default resolver.pipe(
  resolver.zod(IsParticipantInStudy),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId
    if (!userId) throw new Error("Not authenticated")

    const participant = await db.participantStudy.findUnique({
      where: { userId_studyId: { userId, studyId } },
      select: { id: true },
    })

    return { joined: !!participant }
  }
)
