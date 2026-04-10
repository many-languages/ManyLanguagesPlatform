import { resolver } from "@blitzjs/rpc"
import db from "db"
import { DeleteStudy } from "../validations"
import { assertStudyDeleteAllowedByResponses } from "@/src/lib/studies"
import { deletePlatformStudyFromJatos } from "@/src/lib/jatos/admin/deleteStudyWorkflow"

export default resolver.pipe(
  resolver.zod(DeleteStudy),
  resolver.authorize(),
  async ({ id }, ctx) => {
    const userId = ctx.session.userId
    if (!userId) {
      throw new Error("You must be logged in to delete this study")
    }

    const pi = await db.studyResearcher.findFirst({
      where: { studyId: id, userId, role: "PI" },
    })
    if (!pi) {
      throw new Error("You are not authorized to delete this study")
    }

    await assertStudyDeleteAllowedByResponses(id)
    await deletePlatformStudyFromJatos({ studyId: id, actingUserId: userId, mode: "pi" })

    await db.study.delete({ where: { id } })

    return { id }
  }
)
