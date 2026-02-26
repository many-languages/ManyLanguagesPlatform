import { Ctx } from "blitz"
import db from "db"
import { Prisma } from "db"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"

const ENDING_SOON_DAYS = 14
const STARTING_SOON_DAYS = 14
const RECENTLY_PAST_DAYS = 14

export type DeadlineStudy = {
  id: number
  title: string
  startDate: Date
  endDate: Date
  /** Days until/since the relevant deadline. Positive = future, negative = past */
  daysOffset: number
  isSetupComplete: boolean
}

export type UpcomingDeadlines = {
  endingSoon: DeadlineStudy[]
  startingSoon: DeadlineStudy[]
  recentlyPastEnd: DeadlineStudy[]
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
 * Fetches upcoming deadlines for the researcher's non-archived studies.
 * - Ending soon: endDate within next 14 days
 * - Starting soon: startDate within next 14 days
 * - Recently past end: endDate within last 14 days
 */
export async function getUpcomingDeadlines(userId: number): Promise<UpcomingDeadlines> {
  const baseWhere: Prisma.StudyWhereInput = {
    researchers: { some: { userId } },
    archived: false,
  }

  const studies = await db.study.findMany({
    where: baseWhere,
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      description: true,
      researchers: {
        select: {
          id: true,
          role: true,
          userId: true,
        },
      },
      FeedbackTemplate: {
        select: {
          id: true,
        },
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

  const now = startOfDay(new Date())

  const endingSoon: DeadlineStudy[] = []
  const startingSoon: DeadlineStudy[] = []
  const recentlyPastEnd: DeadlineStudy[] = []

  for (const rawStudy of studies) {
    const study = {
      ...rawStudy,
      latestJatosStudyUpload: rawStudy.jatosStudyUploads[0] ?? null,
    }
    const setupComplete = isSetupComplete(study)
    const endDate = new Date(study.endDate)
    const startDate = new Date(study.startDate)

    // Ending soon: endDate in (now, now+14 days]
    const daysUntilEnd = daysBetween(now, endDate)
    if (daysUntilEnd > 0 && daysUntilEnd <= ENDING_SOON_DAYS) {
      endingSoon.push({
        ...study,
        startDate,
        endDate,
        daysOffset: daysUntilEnd,
        isSetupComplete: setupComplete,
      })
    }

    // Starting soon: startDate in (now, now+14 days]
    const daysUntilStart = daysBetween(now, startDate)
    if (daysUntilStart > 0 && daysUntilStart <= STARTING_SOON_DAYS) {
      startingSoon.push({
        ...study,
        startDate,
        endDate,
        daysOffset: daysUntilStart,
        isSetupComplete: setupComplete,
      })
    }

    // Recently past: endDate in [now-14 days, now)
    const daysSinceEnd = daysBetween(endDate, now)
    if (daysSinceEnd >= 0 && daysSinceEnd <= RECENTLY_PAST_DAYS) {
      recentlyPastEnd.push({
        ...study,
        startDate,
        endDate,
        daysOffset: -daysSinceEnd,
        isSetupComplete: setupComplete,
      })
    }
  }

  // Sort: ending soon by soonest first, starting soon by soonest first, recently past by most recent first
  endingSoon.sort((a, b) => a.daysOffset - b.daysOffset)
  startingSoon.sort((a, b) => a.daysOffset - b.daysOffset)
  recentlyPastEnd.sort((a, b) => a.daysOffset - b.daysOffset)

  return {
    endingSoon,
    startingSoon,
    recentlyPastEnd,
  }
}

// Blitz RPC handler - required for files in queries/ dir. Not used; call getUpcomingDeadlines directly.
export default async function getUpcomingDeadlinesRpc(_: unknown, ctx: Ctx) {
  ctx.session.$authorize()
  return getUpcomingDeadlines(ctx.session.userId!)
}
