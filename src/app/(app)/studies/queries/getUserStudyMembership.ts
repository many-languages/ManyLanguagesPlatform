import { resolver } from "@blitzjs/rpc"
import { GetStudy } from "../validations"
import db from "@/db"

export async function getUserStudyMembership(studyId: number, userId: number) {
  const study = await db.study.findUnique({
    where: { id: studyId },
    include: {
      researchers: { where: { userId } },
      participations: { where: { userId } },
    },
  })
  if (!study) return null

  if (study.researchers.length > 0) {
    return { kind: "RESEARCHER" as const, researcher: study.researchers[0] }
  }
  if (study.participations.length > 0) {
    return { kind: "PARTICIPANT" as const, participant: study.participations[0] }
  }
  return null
}

export default resolver.pipe(
  resolver.zod(GetStudy),
  resolver.authorize(), // must be logged in
  async ({ id }, ctx) => {
    if (!ctx.session.userId) throw new Error("Not authenticated")
    return getUserStudyMembership(id, ctx.session.userId)
  }
)
