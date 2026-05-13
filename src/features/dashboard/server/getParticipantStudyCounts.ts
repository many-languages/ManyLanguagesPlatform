import { cache } from "react"
import db from "db"
import { getResultsMetadataForParticipantDashboard } from "@/src/lib/jatos/jatosAccessService"
import { hasCompletedStudy } from "@/src/lib/jatos/utils/findStudyResultIdByComment"
import type { ParticipantStudyCounts } from "../types"
import { requireDashboardUser } from "./auth"

async function findParticipantStudyCounts(userId: number): Promise<ParticipantStudyCounts> {
  const participations = await db.participantStudy.findMany({
    where: {
      userId,
      study: { archived: false, jatosStudyUploads: { some: {} } },
    },
    select: {
      id: true,
      pseudonym: true,
      payed: true,
      study: {
        select: {
          id: true,
          jatosStudyUploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { jatosStudyId: true },
          },
        },
      },
    },
  })

  const jatosStudyIds = participations
    .map((participation) => participation.study.jatosStudyUploads[0]?.jatosStudyId)
    .filter((studyId): studyId is number => studyId != null)

  let metadata: Awaited<ReturnType<typeof getResultsMetadataForParticipantDashboard>> = null

  try {
    metadata = await getResultsMetadataForParticipantDashboard({ userId, jatosStudyIds })
  } catch (error) {
    console.error("JATOS metadata fetch failed for participant study counts:", error)
  }

  let notCompleted = 0
  let completedNotPaid = 0

  for (const participation of participations) {
    const latestUpload = participation.study.jatosStudyUploads[0]
    if (!latestUpload) continue

    const completed = metadata
      ? hasCompletedStudy(metadata, latestUpload.jatosStudyId, participation.pseudonym)
      : false

    if (!completed || metadata === null) {
      notCompleted += 1
    } else if (!participation.payed) {
      completedNotPaid += 1
    }
  }

  const toExplore = await db.study.count({
    where: {
      archived: false,
      status: "OPEN",
      jatosStudyUploads: { some: {} },
      NOT: {
        OR: [{ researchers: { some: { userId } } }, { participations: { some: { userId } } }],
      },
    },
  })

  return {
    all: participations.length,
    notCompleted,
    completedNotPaid,
    toExplore,
  }
}

export const getParticipantStudyCounts = cache(async (): Promise<ParticipantStudyCounts> => {
  const userId = await requireDashboardUser("PARTICIPANT")
  return findParticipantStudyCounts(userId)
})
