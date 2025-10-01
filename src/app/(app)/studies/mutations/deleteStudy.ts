import { resolver } from "@blitzjs/rpc"
import db from "db"
import { DeleteStudy } from "../validations"

export async function deleteStudy(studyId: number, userId: number) {
  // Ensure current user is a PI of the study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId, role: "PI" },
  })

  if (!researcher) {
    throw new Error("You are not authorized to delete this study")
  }

  // Delete the study (cascades handled by Prisma)
  return db.study.delete({
    where: { id: studyId },
  })
}

export default resolver.pipe(
  resolver.zod(DeleteStudy),
  resolver.authorize("RESEARCHER"),
  async ({ id }, ctx) => {
    if (!ctx.session.userId) throw new Error("You must be logged in to delete a study")
    await deleteStudy(id, ctx.session.userId)
    return { id }
  }
)
