import { cache } from "react"
import db, { Prisma } from "db"
import { getResultsMetadataForResearcherDashboard } from "@/src/lib/jatos/jatosAccessService"
import { countNonPilotResponses } from "@/src/lib/jatos/utils/studyHasParticipantResponses"
import type { ActiveStudyWithResponseCount } from "../types"
import { requireDashboardUser } from "./auth"

async function findActiveStudiesWithResponseCounts(
  userId: number
): Promise<ActiveStudyWithResponseCount[]> {
  const baseWhere: Prisma.StudyWhereInput = {
    researchers: { some: { userId } },
    archived: false,
    status: "OPEN",
  }

  const studies = await db.study.findMany({
    where: baseWhere,
    select: {
      id: true,
      title: true,
      sampleSize: true,
      jatosStudyUUID: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const studiesWithUuid = studies.filter(
    (study): study is typeof study & { jatosStudyUUID: string } =>
      study.jatosStudyUUID != null && study.jatosStudyUUID.trim() !== ""
  )

  if (studiesWithUuid.length === 0) {
    return studies.map((study) => ({
      id: study.id,
      title: study.title,
      sampleSize: study.sampleSize,
      responseCount: 0,
    }))
  }

  const studyUuids = studiesWithUuid.map((study) => study.jatosStudyUUID)
  const metadata = await getResultsMetadataForResearcherDashboard({
    studyId: studiesWithUuid[0].id,
    userId,
    studyUuids,
  })

  if (!metadata) {
    return studies.map((study) => ({
      id: study.id,
      title: study.title,
      sampleSize: study.sampleSize,
      responseCount: 0,
    }))
  }

  const metadataByUuid = new Map<string, { responseCount: number }>()

  if (metadata.data) {
    for (const studyMeta of metadata.data) {
      const responseCount = countNonPilotResponses(studyMeta.studyResults ?? [])
      metadataByUuid.set(studyMeta.studyUuid, { responseCount })
    }
  }

  return studies.map((study) => {
    const meta = study.jatosStudyUUID ? metadataByUuid.get(study.jatosStudyUUID) : null

    return {
      id: study.id,
      title: study.title,
      sampleSize: study.sampleSize,
      responseCount: meta?.responseCount ?? 0,
    }
  })
}

export const getActiveStudiesWithResponseCounts = cache(
  async (): Promise<ActiveStudyWithResponseCount[]> => {
    const userId = await requireDashboardUser("RESEARCHER")
    return findActiveStudiesWithResponseCounts(userId)
  }
)
