import { Ctx } from "blitz"
import db from "db"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { hasCompletedStudy } from "@/src/lib/jatos/api/findStudyResultIdByComment"
import type { StudyWithLatestUpload } from "./getStudies"
import type { ParticipantStudyView } from "../utils/participantStudyView"

type ParticipantStudyWithStatus = {
  study: StudyWithLatestUpload
  completed: boolean
  completedUnknown: boolean
  payed: boolean
}

/**
 * Fetches studies the participant has signed up for, with completion (JATOS) and payment status.
 * Supports filtering by participant view. Uses "unknown" when JATOS fetch fails.
 */
export async function getParticipantStudiesWithStatus(
  userId: number,
  view: ParticipantStudyView,
  page: number,
  itemsPerPage: number
): Promise<{ studies: StudyWithLatestUpload[]; hasMore: boolean }> {
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
          title: true,
          description: true,
          sampleSize: true,
          length: true,
          endDate: true,
          archived: true,
          jatosStudyUploads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              jatosStudyId: true,
              jatosBatchId: true,
              jatosWorkerType: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const jatosStudyIds = participations
    .map((p) => p.study.jatosStudyUploads[0]?.jatosStudyId)
    .filter((id): id is number => id != null)

  let metadata: Awaited<ReturnType<typeof getResultsMetadata>> | null = null
  try {
    if (jatosStudyIds.length > 0) {
      metadata = await getResultsMetadata({ studyIds: jatosStudyIds })
    }
  } catch (error) {
    console.error("JATOS metadata fetch failed for participant studies:", error)
  }

  const withStatus: ParticipantStudyWithStatus[] = participations.map((p) => {
    const latestUpload = p.study.jatosStudyUploads[0]
    const completed =
      metadata && latestUpload
        ? hasCompletedStudy(metadata, latestUpload.jatosStudyId, p.pseudonym)
        : false
    const completedUnknown = metadata === null

    return {
      study: {
        ...p.study,
        latestJatosStudyUpload: latestUpload ?? null,
      } as StudyWithLatestUpload,
      completed,
      completedUnknown,
      payed: p.payed,
    }
  })

  const filtered = withStatus.filter((item) => {
    switch (view) {
      case "all":
        return true
      case "completed":
        return item.completed
      case "not_completed":
        return !item.completed || item.completedUnknown
      case "completed_not_paid":
        return item.completed && !item.payed
      default:
        return true
    }
  })

  const start = page * itemsPerPage
  const paginated = filtered.slice(start, start + itemsPerPage)
  const hasMore = filtered.length > start + itemsPerPage

  return {
    studies: paginated.map((item) => item.study),
    hasMore,
  }
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getParticipantStudiesWithStatus directly.
export default async function getParticipantStudiesWithStatusRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  throw new Error("Use getParticipantStudiesWithStatus directly, not via RPC")
}
