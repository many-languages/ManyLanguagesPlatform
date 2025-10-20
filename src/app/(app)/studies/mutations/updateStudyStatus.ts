import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const UpdateStudyStatusSchema = z.object({
  studyId: z.number(),
  status: z.enum(["OPEN", "CLOSED"]),
})

export default resolver.pipe(
  resolver.zod(UpdateStudyStatusSchema),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, status }, ctx) => {
    // Verify the user is a researcher on this study
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId: ctx.session.userId! },
    })

    if (!researcher) {
      throw new Error("You are not authorized to modify this study.")
    }

    const study = await db.study.update({
      where: { id: studyId },
      data: { status },
      select: {
        id: true,
        title: true,
        status: true,
      },
    })

    return study
  }
)
