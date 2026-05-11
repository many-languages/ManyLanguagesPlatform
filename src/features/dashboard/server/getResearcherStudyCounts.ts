import { cache } from "react"
import { Prisma } from "db"
import { getStudySummaryCounts } from "@/src/features/studies"
import type { ResearcherStudyCounts } from "../types"
import { requireDashboardUser } from "./auth"

async function findResearcherStudyCounts(userId: number): Promise<ResearcherStudyCounts> {
  const baseWhere: Prisma.StudyWhereInput = {
    researchers: { some: { userId } },
  }

  return getStudySummaryCounts(baseWhere)
}

export const getResearcherStudyCounts = cache(async (): Promise<ResearcherStudyCounts> => {
  const userId = await requireDashboardUser("RESEARCHER")
  return findResearcherStudyCounts(userId)
})
