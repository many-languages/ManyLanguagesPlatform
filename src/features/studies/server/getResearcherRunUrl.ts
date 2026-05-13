import { cache } from "react"
import db from "db"
import { withStudyAccess } from "./withStudyAccess"

export const getResearcherRunUrlRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async (_studyId, userId) => {
    const researcher = await db.studyResearcher.findUnique({
      where: { studyId_userId: { studyId, userId } },
      select: { id: true, studyId: true },
    })

    if (!researcher) {
      throw new Error("You are not assigned to this study")
    }

    const latestUpload = await db.jatosStudyUpload.findFirst({
      where: { studyId: researcher.studyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    const latestPilotLink = latestUpload
      ? await db.pilotLink.findFirst({
          where: {
            studyResearcherId: researcher.id,
            jatosStudyUploadId: latestUpload.id,
          },
          orderBy: { createdAt: "desc" },
          select: { jatosRunUrl: true },
        })
      : null

    return {
      id: researcher.id,
      jatosRunUrl: latestPilotLink?.jatosRunUrl ?? null,
    }
  })
})
