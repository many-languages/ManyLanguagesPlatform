import db, { Prisma } from "db"
import { isSetupComplete, type StudyWithMinimalRelations } from "../domain/setup/setupStatus"

export type StudySummaryCounts = {
  all: number
  active: number
  archived: number
  setupIncomplete: number
}

async function findStudiesForSetupFilter(
  where: Prisma.StudyWhereInput
): Promise<StudyWithMinimalRelations[]> {
  const studies = await db.study.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      title: true,
      description: true,
      FeedbackTemplate: {
        select: { id: true },
      },
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
          jatosWorkerType: true,
          jatosFileName: true,
        },
      },
    },
  })

  return studies.map((study) => ({
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }))
}

export async function getStudySummaryCounts(
  baseWhere: Prisma.StudyWhereInput = {}
): Promise<StudySummaryCounts> {
  const setupFilterWhere = { AND: [baseWhere, { archived: false }] }

  const [allCount, activeCount, archivedCount, studiesForSetupFilter] = await Promise.all([
    db.study.count({ where: baseWhere }),
    db.study.count({
      where: { AND: [baseWhere, { archived: false }, { status: "OPEN" }] },
    }),
    db.study.count({
      where: { AND: [baseWhere, { archived: true }] },
    }),
    findStudiesForSetupFilter(setupFilterWhere),
  ])

  const setupIncompleteCount = studiesForSetupFilter.filter(
    (study) => !isSetupComplete(study)
  ).length

  return {
    all: allCount,
    active: activeCount,
    archived: archivedCount,
    setupIncomplete: setupIncompleteCount,
  }
}
