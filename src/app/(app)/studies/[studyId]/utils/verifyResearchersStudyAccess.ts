import db from "db"
import { getBlitzContext } from "@/src/app/blitz-server"

export async function verifyResearcherStudyAccess(studyId: number): Promise<void> {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")

  const researcher = await db.studyResearcher.findFirst({
    where: { studyId, userId: session.userId },
  })

  if (!researcher) {
    throw new Error("You are not authorized to access this study.")
  }
}
