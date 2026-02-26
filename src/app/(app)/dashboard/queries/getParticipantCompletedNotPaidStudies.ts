import { Ctx } from "blitz"
import db from "db"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import {
  hasCompletedStudy,
  findStudyResultByPseudonym,
} from "@/src/lib/jatos/api/findStudyResultIdByComment"

export type ParticipantCompletedNotPaidStudy = {
  id: number
  title: string
  payment: string
  completedAt: Date
  endDate: Date
}

/**
 * Fetches studies the participant completed but has not been paid for.
 * Includes study name, payment description, completion date (from JATOS), and study end date.
 */
export async function getParticipantCompletedNotPaidStudies(
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
    .map((p) => p.study.jatosStudyUploads[0]?.jatosStudyId)
    .filter((id): id is number => id != null)

  let metadata: Awaited<ReturnType<typeof getResultsMetadata>> | null = null
  try {
    if (jatosStudyIds.length > 0) {
      metadata = await getResultsMetadata({ studyIds: jatosStudyIds })
    }
  } catch (error) {
    console.error("JATOS metadata fetch failed for completed-not-paid studies:", error)
    return []
  }

  const results: ParticipantCompletedNotPaidStudy[] = []

  for (const p of participations) {
    const latestUpload = p.study.jatosStudyUploads[0]
    if (!latestUpload || !metadata) continue

    if (!hasCompletedStudy(metadata, latestUpload.jatosStudyId, p.pseudonym)) {
      continue
    }

    const result = findStudyResultByPseudonym(metadata, latestUpload.jatosStudyId, p.pseudonym)
    // endDate from JATOS is Unix timestamp in milliseconds
    const completedAt = result ? new Date(result.endDate) : new Date(p.study.endDate) // fallback if result not found

    results.push({
      id: p.study.id,
      title: p.study.title,
      payment: p.study.payment,
      completedAt,
      endDate: new Date(p.study.endDate),
    })
  }

  // Sort by completion date, most recent first
  results.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

  return results
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getParticipantCompletedNotPaidStudies directly.
export default async function getParticipantCompletedNotPaidStudiesRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getParticipantCompletedNotPaidStudies(ctx.session.userId!)
}
