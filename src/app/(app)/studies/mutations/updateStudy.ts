import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateStudy, UpdateStudyInput } from "../validations"

export async function updateStudy(
  studyId: number,
  userId: number,
  data: Omit<UpdateStudyInput, "id">
) {
  // Ensure current user is a PI of the study
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId, role: "PI" },
  })
  if (!researcher) {
    throw new Error("You are not authorized to update this study")
  }

  // Apply update
  return db.study.update({
    where: { id: studyId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  })
}

export default resolver.pipe(
  resolver.zod(UpdateStudy),
  resolver.authorize("RESEARCHER"), // global role check
  async ({ id, ...data }, ctx) => {
    if (!ctx.session.userId) throw new Error("Not authenticated")
    return updateStudy(id, ctx.session.userId, data)
  }
)
