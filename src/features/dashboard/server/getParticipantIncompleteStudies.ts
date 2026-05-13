import { cache } from "react"
import db from "db"
import { getResultsMetadataForParticipantDashboard } from "@/src/lib/jatos/jatosAccessService"
import { hasCompletedStudy } from "@/src/lib/jatos/utils/findStudyResultIdByComment"
import type { ParticipantIncompleteStudies, ParticipantIncompleteStudy } from "../types"
import { requireDashboardUser } from "./auth"

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function daysBetween(from: Date, to: Date): number {
  const fromDay = startOfDay(from)
  const toDay = startOfDay(to)
  return Math.round((toDay.getTime() - fromDay.getTime()) / (24 * 60 * 60 * 1000))
}

async function findParticipantIncompleteStudies(
  userId: number
): Promise<ParticipantIncompleteStudies> {
  const participations = await db.participantStudy.findMany({
    where: {
      userId,
      study: {
        status: "OPEN",
        archived: false,
        jatosStudyUploads: { some: {} },
      },
    },
    select: {
      id: true,
      pseudonym: true,
      jatosRunUrl: true,
      study: {
        select: {
          id: true,
          title: true,
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

  const now = startOfDay(new Date())
  const results: ParticipantIncompleteStudy[] = []
  const jatosStudyIds: number[] = []

  for (const participation of participations) {
    const latestUpload = participation.study.jatosStudyUploads[0]
    if (!latestUpload) continue

    jatosStudyIds.push(latestUpload.jatosStudyId)
  }

  let metadata: Awaited<ReturnType<typeof getResultsMetadataForParticipantDashboard>> = null

  try {
    metadata = await getResultsMetadataForParticipantDashboard({ userId, jatosStudyIds })
  } catch (error) {
    console.error("JATOS metadata fetch failed for participant incomplete studies:", error)
  }

  for (const participation of participations) {
    const latestUpload = participation.study.jatosStudyUploads[0]
    if (!latestUpload) continue

    const endDate = new Date(participation.study.endDate)
    const daysUntilDeadline = daysBetween(now, endDate)
    const isPastDeadline = daysUntilDeadline <= 0

    if (
      metadata &&
      hasCompletedStudy(metadata, latestUpload.jatosStudyId, participation.pseudonym)
    ) {
      continue
    }

    const completionStatus: "incomplete" | "unknown" = metadata ? "incomplete" : "unknown"

    results.push({
      id: participation.study.id,
      title: participation.study.title,
      endDate,
      daysUntilDeadline,
      participationId: participation.id,
      jatosRunUrl: participation.jatosRunUrl,
      completionStatus,
      isPastDeadline,
    })
  }

  const nearingDeadline = results
    .filter((study) => !study.isPastDeadline)
    .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
  const passedDeadline = results
    .filter((study) => study.isPastDeadline)
    .sort((a, b) => b.daysUntilDeadline - a.daysUntilDeadline)

  return {
    nearingDeadline,
    passedDeadline,
  }
}

export const getParticipantIncompleteStudies = cache(
  async (): Promise<ParticipantIncompleteStudies> => {
    const userId = await requireDashboardUser("PARTICIPANT")
    return findParticipantIncompleteStudies(userId)
  }
)
