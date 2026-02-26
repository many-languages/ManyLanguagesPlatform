import { Ctx } from "blitz"
import db from "db"
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"
import { hasCompletedStudy } from "@/src/lib/jatos/api/findStudyResultIdByComment"

export type ParticipantIncompleteStudy = {
  id: number
  title: string
  endDate: Date
  /** Positive = future, 0 = today, negative = past */
  daysUntilDeadline: number
  participationId: number
  jatosRunUrl: string | null
  completionStatus: "incomplete" | "unknown"
  isPastDeadline: boolean
}

export type ParticipantIncompleteStudies = {
  nearingDeadline: ParticipantIncompleteStudy[]
  passedDeadline: ParticipantIncompleteStudy[]
}

function startOfDay(d: Date): Date {
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  return result
}

function daysBetween(from: Date, to: Date): number {
  const fromDay = startOfDay(from)
  const toDay = startOfDay(to)
  return Math.round((toDay.getTime() - fromDay.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Fetches studies the participant signed up for but hasn't completed.
 * Shows both nearing-deadline and passed-deadline studies.
 * Uses "unknown" completion status when JATOS fetch fails.
 */
export async function getParticipantIncompleteStudies(
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

  for (const p of participations) {
    const latestUpload = p.study.jatosStudyUploads[0]
    if (!latestUpload) continue

    jatosStudyIds.push(latestUpload.jatosStudyId)
  }

  let metadata: Awaited<ReturnType<typeof getResultsMetadata>> | null = null
  try {
    if (jatosStudyIds.length > 0) {
      metadata = await getResultsMetadata({ studyIds: jatosStudyIds })
    }
  } catch (error) {
    console.error("JATOS metadata fetch failed for participant incomplete studies:", error)
  }

  for (const p of participations) {
    const latestUpload = p.study.jatosStudyUploads[0]
    if (!latestUpload) continue

    const endDate = new Date(p.study.endDate)
    const daysUntilDeadline = daysBetween(now, endDate)
    const isPastDeadline = daysUntilDeadline <= 0

    // Skip completed studies (when we have metadata)
    if (metadata && hasCompletedStudy(metadata, latestUpload.jatosStudyId, p.pseudonym)) {
      continue
    }

    const completionStatus: "incomplete" | "unknown" = metadata ? "incomplete" : "unknown"

    results.push({
      id: p.study.id,
      title: p.study.title,
      endDate,
      daysUntilDeadline,
      participationId: p.id,
      jatosRunUrl: p.jatosRunUrl,
      completionStatus,
      isPastDeadline,
    })
  }

  const nearingDeadline = results
    .filter((s) => !s.isPastDeadline)
    .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
  const passedDeadline = results
    .filter((s) => s.isPastDeadline)
    .sort((a, b) => b.daysUntilDeadline - a.daysUntilDeadline) // Most recently passed first

  return {
    nearingDeadline,
    passedDeadline,
  }
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getParticipantIncompleteStudies directly.
export default async function getParticipantIncompleteStudiesRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getParticipantIncompleteStudies(ctx.session.userId!)
}
