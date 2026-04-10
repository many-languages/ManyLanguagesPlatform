import { Ctx } from "blitz"
import { Prisma } from "db"
import {
  getStudySummaryCounts,
  type StudySummaryCounts,
} from "@/src/lib/studies/studySummaryCounts"

export type ResearcherStudyCounts = StudySummaryCounts

export async function getResearcherStudyCounts(userId: number): Promise<ResearcherStudyCounts> {
  const baseWhere: Prisma.StudyWhereInput = {
    researchers: { some: { userId } },
  }
  return getStudySummaryCounts(baseWhere)
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getResearcherStudyCounts directly.
export default async function getResearcherStudyCountsRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getResearcherStudyCounts(ctx.session.userId!)
}
