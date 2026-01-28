import db from "db"
import { cache } from "react"

const checkDbAccess = cache(async (studyId: number, userId: number) => {
  console.log(`Checking DB access for User: ${userId} on Study: ${studyId}`) // You'll see this only once per request
  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId: userId },
  })
  return !!researcher
})

export async function verifyResearcherStudyAccess(studyId: number, userId: number): Promise<void> {
  const hasAccess = await checkDbAccess(studyId, userId)

  if (!hasAccess) {
    throw new Error("You are not authorized to access this study.")
  }
}
