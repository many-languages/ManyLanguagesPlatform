import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { getResultsMetadataForParticipantDashboard } from "@/src/lib/jatos/jatosAccessService"
import { hasCompletedStudy } from "@/src/lib/jatos/utils/findStudyResultIdByComment"
import type { ParticipantStudyView } from "../domain/participantStudyView"
import { studyWithLatestUploadSelect } from "../studySelects"
import type { StudyWithLatestUpload } from "../types"

type ParticipantStudyWithStatus = {
  study: StudyWithLatestUpload
  completed: boolean
  completedUnknown: boolean
  payed: boolean
}

function attachLatestJatosStudyUpload(
  study: Omit<StudyWithLatestUpload, "latestJatosStudyUpload">
): StudyWithLatestUpload {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

async function findParticipantStudiesWithStatus(
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
        select: studyWithLatestUploadSelect,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const jatosStudyIds = participations
    .map((participation) => participation.study.jatosStudyUploads[0]?.jatosStudyId)
    .filter((studyId): studyId is number => studyId != null)

  let metadata: Awaited<ReturnType<typeof getResultsMetadataForParticipantDashboard>> = null
  try {
    metadata = await getResultsMetadataForParticipantDashboard({ userId, jatosStudyIds })
  } catch (error) {
    console.error("JATOS metadata fetch failed for participant studies:", error)
  }

  const withStatus: ParticipantStudyWithStatus[] = participations.map((participation) => {
    const latestUpload = participation.study.jatosStudyUploads[0]
    const completed =
      metadata && latestUpload
        ? hasCompletedStudy(metadata, latestUpload.jatosStudyId, participation.pseudonym)
        : false
    const completedUnknown = metadata === null

    return {
      study: attachLatestJatosStudyUpload(participation.study),
      completed,
      completedUnknown,
      payed: participation.payed,
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

export async function getParticipantStudiesWithStatus(
  view: ParticipantStudyView,
  page: number,
  itemsPerPage: number
): Promise<{ studies: StudyWithLatestUpload[]; hasMore: boolean }> {
  const session = await getAuthorizedSession()
  if (session.userId == null) {
    throw new Error("Not authenticated")
  }

  return findParticipantStudiesWithStatus(session.userId, view, page, itemsPerPage)
}
