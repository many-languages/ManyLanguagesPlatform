import { cache } from "react"
import db from "db"
import { getResultsMetadataForParticipantDashboard } from "@/src/lib/jatos/jatosAccessService"
import {
  findStudyResultByPseudonym,
  hasCompletedStudy,
} from "@/src/lib/jatos/utils/findStudyResultIdByComment"
import type { ParticipantCompletedNotPaidStudy } from "../types"
import { requireDashboardUser } from "./auth"

async function findParticipantCompletedNotPaidStudies(
  userId: number
): Promise<ParticipantCompletedNotPaidStudy[]> {
  const participations = await db.participantStudy.findMany({
    where: {
      userId,
      payed: false,
      study: { archived: false, jatosStudyUploads: { some: {} } },
    },
    select: {
      pseudonym: true,
      study: {
        select: {
          id: true,
          title: true,
          payment: true,
          endDate: true,
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
    console.error("JATOS metadata fetch failed for completed-not-paid studies:", error)
    return []
  }

  const results: ParticipantCompletedNotPaidStudy[] = []

  for (const participation of participations) {
    const latestUpload = participation.study.jatosStudyUploads[0]
    if (!latestUpload || !metadata) continue

    if (!hasCompletedStudy(metadata, latestUpload.jatosStudyId, participation.pseudonym)) {
      continue
    }

    const result = findStudyResultByPseudonym(
      metadata,
      latestUpload.jatosStudyId,
      participation.pseudonym
    )
    const completedAt = result ? new Date(result.endDate) : new Date(participation.study.endDate)

    results.push({
      id: participation.study.id,
      title: participation.study.title,
      payment: participation.study.payment,
      completedAt,
      endDate: new Date(participation.study.endDate),
    })
  }

  results.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

  return results
}

export const getParticipantCompletedNotPaidStudies = cache(
  async (): Promise<ParticipantCompletedNotPaidStudy[]> => {
    const userId = await requireDashboardUser("PARTICIPANT")
    return findParticipantCompletedNotPaidStudies(userId)
  }
)
