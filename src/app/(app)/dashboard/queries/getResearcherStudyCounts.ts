import { Ctx } from "blitz"
import db from "db"
import { getStudies } from "@/src/app/(app)/studies/queries/getStudies"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithLatestUpload } from "@/src/app/(app)/studies/queries/getStudies"
import { Prisma } from "db"

export type ResearcherStudyCounts = {
  all: number
  active: number
  archived: number
  setupIncomplete: number
}

export async function getResearcherStudyCounts(userId: number): Promise<ResearcherStudyCounts> {
  const baseWhere: Prisma.StudyWhereInput = {
    researchers: { some: { userId } },
  }

  const [allCount, activeCount, archivedCount, studiesForSetupFilter] = await Promise.all([
    db.study.count({ where: baseWhere }),
    db.study.count({
      where: { AND: [baseWhere, { archived: false }, { status: "OPEN" }] },
    }),
    db.study.count({
      where: { AND: [baseWhere, { archived: true }] },
    }),
    getStudies({
      where: { AND: [baseWhere, { archived: false }] },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 500,
    }),
  ])

  const setupIncompleteCount = studiesForSetupFilter.studies.filter(
    (s) => !isSetupComplete(s as StudyWithLatestUpload)
  ).length

  return {
    all: allCount,
    active: activeCount,
    archived: archivedCount,
    setupIncomplete: setupIncompleteCount,
  }
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getResearcherStudyCounts directly.
export default async function getResearcherStudyCountsRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getResearcherStudyCounts(ctx.session.userId!)
}
