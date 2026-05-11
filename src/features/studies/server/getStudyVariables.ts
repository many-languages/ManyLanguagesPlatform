import { cache } from "react"
import db from "db"
import { withStudyAccess } from "./withStudyAccess"

export const getStudyVariablesRsc = cache(async (studyId: number) => {
  return withStudyAccess(studyId, async () => {
    const study = await db.study.findUnique({
      where: { id: studyId },
      select: {
        jatosStudyUploads: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { approvedExtractionId: true },
        },
      },
    })

    const latestUpload = study?.jatosStudyUploads[0] ?? null
    if (!latestUpload?.approvedExtractionId) {
      return []
    }

    return db.studyVariable.findMany({
      where: { extractionSnapshotId: latestUpload.approvedExtractionId },
      orderBy: { variableName: "asc" },
    })
  })
})
