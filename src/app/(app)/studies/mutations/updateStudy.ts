import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateStudy, UpdateStudyInput } from "../validations"

export async function updateStudy(
  studyId: number,
  userId: number,
  data: Omit<UpdateStudyInput, "id">
) {
  // Ensure the current user is a PI of the study
  const isPI = await db.studyResearcher.findFirst({
    where: { studyId, userId, role: "PI" },
    select: { id: true },
  })
  if (!isPI) {
    throw new Error("You are not authorized to update this study")
  }

  // Apply update — no redundant transformations
  return db.study.update({
    where: { id: studyId },
    data: {
      title: data.title,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      sampleSize: data.sampleSize,
      payment: data.payment,
      ethicalPermission: data.ethicalPermission,
      length: data.length,
      status: data.status,
    },
  })
}

export default resolver.pipe(
  resolver.zod(UpdateStudy),
  resolver.authorize("RESEARCHER"), // ensure user is at least a researcher
  async ({ id, ...data }, ctx) => {
    if (!ctx.session.userId) throw new Error("Not authenticated")
    return updateStudy(id, ctx.session.userId, data)
  }
)
