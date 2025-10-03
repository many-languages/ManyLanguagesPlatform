import { resolver } from "@blitzjs/rpc"
import { UnarchiveStudy } from "../validations"
import db from "@/db"

export default resolver.pipe(
  resolver.authorize(),
  resolver.zod(UnarchiveStudy),
  async ({ id }, ctx) => {
    const can = await db.studyResearcher.findFirst({
      where: { studyId: id, userId: ctx.session.userId, role: "PI" },
    })
    if (!can) throw new Error("You are not authorized to unarchive this study")

    return db.study.update({
      where: { id },
      data: { archived: false, archivedAt: null, archivedById: null },
      select: { id: true, archived: true },
    })
  }
)
