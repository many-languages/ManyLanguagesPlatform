import { cache } from "react"
import db, { Prisma } from "db"
import { isSetupComplete } from "@/src/features/studies"
import type { DeadlineStudy, UpcomingDeadlines } from "../types"
import { requireDashboardUser } from "./auth"

const ENDING_SOON_DAYS = 14
const STARTING_SOON_DAYS = 14
const RECENTLY_PAST_DAYS = 14

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

async function findUpcomingDeadlines(userId: number): Promise<UpcomingDeadlines> {
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

  endingSoon.sort((a, b) => a.daysOffset - b.daysOffset)
  startingSoon.sort((a, b) => a.daysOffset - b.daysOffset)
  recentlyPastEnd.sort((a, b) => a.daysOffset - b.daysOffset)

  return {
    endingSoon,
    startingSoon,
    recentlyPastEnd,
  }
}

export const getUpcomingDeadlines = cache(async (): Promise<UpcomingDeadlines> => {
  const userId = await requireDashboardUser("RESEARCHER")
  return findUpcomingDeadlines(userId)
})
