import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ArchiveStudy } from "../validations"

export async function archiveStudy(studyId: number, userId: number) {
  // Ensure current user is a PI of the study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId, role: "PI" },
  })

  if (!researcher) {
    throw new Error("You are not authorized to delete this study")
  }

  return db.study.update({
    where: { id: studyId },
    data: { archived: true, archivedAt: new Date(), archivedById: userId },
    select: { id: true, archived: true, archivedAt: true },
  })
}

export default resolver.pipe(
  resolver.zod(ArchiveStudy),
  resolver.authorize(),
  async ({ id }, ctx) => {
    if (!ctx.session.userId) throw new Error("You must be logged in to delete a study")

    const archivedStudy = await archiveStudy(id, ctx.session.userId)

    return archivedStudy
  }
)
