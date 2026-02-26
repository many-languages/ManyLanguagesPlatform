import { Ctx } from "blitz"
import db from "db"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { hasCompletedStudy } from "@/src/lib/jatos/api/findStudyResultIdByComment"

export type ParticipantStudyCounts = {
  all: number
  notCompleted: number
  completedNotPaid: number
  toExplore: number
}

/**
 * Fetches study counts for the participant dashboard.
 * - all: studies signed up for (non-archived)
 * - notCompleted: signed-up studies not yet completed (includes unknown when JATOS fails)
 * - completedNotPaid: completed studies awaiting payment
 * - toExplore: studies available to join (open, not signed up, not researcher)
 */
export async function getParticipantStudyCounts(userId: number): Promise<ParticipantStudyCounts> {
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
    .map((p) => p.study.jatosStudyUploads[0]?.jatosStudyId)
    .filter((id): id is number => id != null)

  let metadata: Awaited<ReturnType<typeof getResultsMetadata>> | null = null
  try {
    if (jatosStudyIds.length > 0) {
      metadata = await getResultsMetadata({ studyIds: jatosStudyIds })
    }
  } catch (error) {
    console.error("JATOS metadata fetch failed for participant study counts:", error)
  }

  let notCompleted = 0
  let completedNotPaid = 0

  for (const p of participations) {
    const latestUpload = p.study.jatosStudyUploads[0]
    if (!latestUpload) continue

    const completed = metadata
      ? hasCompletedStudy(metadata, latestUpload.jatosStudyId, p.pseudonym)
      : false

    if (!completed || metadata === null) {
      notCompleted += 1
    } else if (!p.payed) {
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

// Blitz RPC handler - required for files in queries/ dir. Not used; call getParticipantStudyCounts directly.
export default async function getParticipantStudyCountsRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getParticipantStudyCounts(ctx.session.userId!)
}
