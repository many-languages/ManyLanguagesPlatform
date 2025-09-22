import { resolver } from "@blitzjs/rpc"
import db from "db"
import { DeleteStudy } from "../validations"

export default resolver.pipe(
  resolver.zod(DeleteStudy),
  resolver.authorize("RESEARCHER"), // only researchers can delete studies
  async ({ id }, ctx) => {
    const userId = ctx.session.userId
    if (!userId) throw new Error("You must be logged in to delete a study")

    // Ensure current user is a PI of the study
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId: id, userId, role: "PI" },
    })

    if (!researcher) {
      throw new Error("You are not authorized to delete this study")
    }

    // Delete the study (cascades to StudyResearcher + ParticipantStudy)
    await db.study.delete({
      where: { id },
    })

    return { id }
  }
)
