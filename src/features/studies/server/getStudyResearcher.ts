import { cache } from "react"
import db from "db"
import { withStudyAccess } from "./withStudyAccess"

export const getStudyResearcherRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async (_studyId, userId) => {
    const researcher = await db.studyResearcher.findUnique({
      where: { studyId_userId: { studyId, userId } },
      select: { id: true, role: true, createdAt: true },
    })

    if (!researcher) {
      throw new Error("You are not assigned to this study")
    }

    return researcher
  })
})
