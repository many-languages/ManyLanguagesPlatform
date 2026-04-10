import db from "db"
import { Prisma } from "db"
import { getStudies } from "@/src/app/(app)/studies/queries/getStudies"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithLatestUpload } from "@/src/app/(app)/studies/queries/getStudies"

export type StudySummaryCounts = {
  all: number
  active: number
  archived: number
  setupIncomplete: number
}

export async function getStudySummaryCounts(
  baseWhere: Prisma.StudyWhereInput = {}
): Promise<StudySummaryCounts> {
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
